import React, { useState, useEffect, useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import * as dashJs from 'dashjs';
import { uniqueId } from 'lodash';
import type { MediaPlayerClass } from 'dashjs';
import { serverHost } from '@/server/training-server';
import type { Quality } from '../video-controls';
import VideoControls from '../video-controls';
import BilibiliLoginModal from '../bilibili-login-modal';
import aiVideoAssistantImg from './ai_video_assistant.png'
import questionHereImg from './question_here.png'
import { sendToAI } from '../ai-conversation';

export interface Source {
  src: string;
  type: 'application/dash+xml';
}

interface FormatItem {
  id: number;
  new_description: string;
  display_desc?: string;
  codecs?: string;
}

// 字幕接口定义
export interface Subtitle {
  end: string;
  seq: number;
  text: string;
  start: string;
}

interface PlayerProps {
  url?: string;
  autoPlay?: boolean;
  width?: string;
  height?: string;
  subtitles?: Subtitle[];
  onError?: (error: Error) => void;
  onLoaded?: (player: MediaPlayerClass) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onLoginSuccess?: () => void;
}

export interface VideoPlayerRef {
  updateSrc: (newSource: Source) => void;
  getPlayer: () => MediaPlayerClass | null;
  play: () => void;
  pause: () => void;
}

// 时间格式转换工具函数
const parseTimeToSeconds = (timeString: string): number => {
  // 格式: HH:MM:SS,mmm
  const [time, milliseconds] = timeString.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  const ms = Number(milliseconds || 0);

  return hours * 3600 + minutes * 60 + seconds + ms / 1000;
};

// Main Video Player Component
export const VideoPlayer = forwardRef<VideoPlayerRef, PlayerProps>(
  (
    {
      url,
      autoPlay = false,
      width = '100%',
      height = 'auto',
      subtitles = [],
      onError,
      onLoaded,
      onPlay,
      onPause,
      onEnded,
      onLoginSuccess,
    },
    ref
  ) => {
    // State
    const [options, setOptions] = useState<Source>({
      src: '',
      type: 'application/dash+xml'
    });
    const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [bufferedPercent, setBufferedPercent] = useState<number>(0);
    const [playedPercent, setPlayedPercent] = useState<number>(0);
    const [volume, setVolume] = useState<number>(0.7);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [showControls, setShowControls] = useState<boolean>(true);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [formatListTwo, setFormatListTwo] = useState<FormatItem[]>([]);
    const [availableQualities, setAvailableQualities] = useState<Quality[]>([]);
    const [currentQualityIndex, setCurrentQualityIndex] = useState<number>(-1);
    const [currentQuality, setCurrentQuality] = useState<string>('自动');
    const [currentAutoQuality, setCurrentAutoQuality] = useState<string>('');
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [switchMessage, setSwitchMessage] = useState<string>('');
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
    const [isPiPSupported] = useState<boolean>('pictureInPictureEnabled' in document);
    const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
    const [showSubtitles, setShowSubtitles] = useState<boolean>(true);

    // Refs
    const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
    const playerRef = useRef<MediaPlayerClass | null>(null);
    const playerIdRef = useRef<string>(uniqueId('video-'));
    const formatListRef = useRef<FormatItem[]>([]);
    const hideControlsTimer = useRef<number | null>(null);
    const previousBlobUrl = useRef<string | null>(null);

    // 处理字幕数据，预先转换时间为秒数
    const processedSubtitles = useMemo(() => {
      return subtitles.map(sub => ({
        ...sub,
        startTime: parseTimeToSeconds(sub.start),
        endTime: parseTimeToSeconds(sub.end)
      }));
    }, [subtitles]);

    // Computed
    const containerWidth = useMemo(() => {
      return width.includes('%') || width.includes('px') ? width : `${width}px`;
    }, [width]);

    const containerHeight = useMemo(() => {
      return height.includes('%') || height.includes('px') ? height : `${height}px`;
    }, [height]);

    // 根据当前时间更新字幕
    useEffect(() => {
      if (processedSubtitles.length === 0) {
        setCurrentSubtitle('');
        return;
      }

      const currentSub = processedSubtitles.find(
        sub => currentTime >= sub.startTime && currentTime <= sub.endTime
      );

      setCurrentSubtitle(currentSub?.text || '');
    }, [currentTime, processedSubtitles]);

    function getBilibiliProxy(bilibiliUrl: string): string {
      const baseUrl = `${serverHost}/proxy/bilibili/video-manifest?bvid=`;
      if (!bilibiliUrl) return baseUrl;

      let bvid = '';
      let p: string | null = null;
      let cid: string | null = null;

      try {
        const urlObj = new URL(bilibiliUrl);
        const parts = urlObj.pathname.split('/').filter(Boolean);
        bvid = parts.length > 0 ? parts[parts.length - 1] : '';
        p = urlObj.searchParams.get('p');
        cid = urlObj.searchParams.get('cid');
      } catch {
        const urlParts = bilibiliUrl.split('?');
        const pathParts = urlParts[0].split('/').filter(Boolean);
        bvid = pathParts.length > 0 ? pathParts[pathParts.length - 1] : '';
        if (urlParts.length > 1) {
          const queryParams = new URLSearchParams(urlParts[1]);
          p = queryParams.get('p');
          cid = queryParams.get('cid');
        }
      }

      let proxyUrl = `${baseUrl}${encodeURIComponent(bvid)}`;
      if (p !== null) {
        proxyUrl += `&p=${encodeURIComponent(p)}`;
      }
      if (cid !== null) {
        proxyUrl += `&cid=${encodeURIComponent(cid)}`;
      }
      return proxyUrl;
    }

    useEffect(() => {
      formatListRef.current = formatListTwo;
    }, [formatListTwo]);

    const refetchManifest = () => {
      if (!url) return;
      fetch(getBilibiliProxy(url))
        .then(res => res.json())
        .then(data => {
          const xmlString = data.data.unifiedMpd;
          setFormatListTwo(data.data.formatList);
          const xmlBlob = new Blob([xmlString], { type: 'application/dash+xml' });
          const blobUrl = URL.createObjectURL(xmlBlob);
          setOptions({
            src: blobUrl,
            type: 'application/dash+xml'
          });
        })
        .catch(error => {
          console.error("Failed to fetch MPD:", error);
        });
    };

    useEffect(() => {
      refetchManifest();
    }, [url]);

    // Handlers
    const togglePlay = () => {
      if (!videoPlayerRef.current) return;
      if (isPlaying) {
        videoPlayerRef.current.pause();
      } else {
        videoPlayerRef.current.play();
      }
    };

    const handleVolumeChange = (newVolume: number) => {
      setVolume(newVolume);
      if (videoPlayerRef.current) {
        videoPlayerRef.current.volume = newVolume;
        setIsMuted(newVolume === 0);
      }
    };

    const toggleMute = () => {
      if (!videoPlayerRef.current) return;
      if (isMuted) {
        videoPlayerRef.current.muted = false;
        setIsMuted(false);
        if (volume === 0) {
          const newVolume = 0.5;
          setVolume(newVolume);
          videoPlayerRef.current.volume = newVolume;
        }
      } else {
        videoPlayerRef.current.muted = true;
        setIsMuted(true);
      }
    };

    const seek = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!videoPlayerRef.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      videoPlayerRef.current.currentTime = percent * duration;
    };

    const handleSpeedChange = (speed: number) => {
      setPlaybackSpeed(speed);
      if (videoPlayerRef.current) {
        videoPlayerRef.current.playbackRate = speed;
      }
    };

    const handleSubtitleToggle = (show: boolean) => {
      setShowSubtitles(show);
    };

    const toggleFullscreen = () => {
      const container = videoPlayerRef.current?.parentElement;
      if (!container) return;
      if (!isFullscreen) {
        if (container.requestFullscreen) {
          container.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    };

    const togglePiP = async () => {
      if (!videoPlayerRef.current || !isPiPSupported) return;
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoPlayerRef.current.requestPictureInPicture();
        }
      } catch (error) {
        console.error('画中画切换失败:', error);
      }
    };

    const updateQualityList = () => {
      if (!playerRef.current) return;

      if (!playerRef.current || currentQualityIndex !== -1) return;
      const videoRepresentations = playerRef.current.getRepresentationsByType('video');
      if (videoRepresentations.length === 0) return;

      const currentRepresentation = playerRef.current.getCurrentRepresentationForType('video');
      if (!currentRepresentation) {
        setCurrentQuality('自动');
        setCurrentAutoQuality('');
        return;
      }

      const matchingQuality = formatListRef.current.find((quality) => {
        return quality.id === Number(currentRepresentation.id);
      });

      if (matchingQuality) {
        const formatItem = formatListRef.current.find(item => item.id === matchingQuality.id);
        const autoDesc = formatItem?.display_desc;
        if (autoDesc) {
          setCurrentAutoQuality(autoDesc);
        }
        setCurrentQuality('自动');
      } else {
        setCurrentQuality('自动');
        setCurrentAutoQuality('');
      }
    };

    const changeQuality = (index: number) => {
      if (!playerRef.current || !availableQualities.length) return;
      const wasPlaying = isPlaying;

      if (index === -1) {
        playerRef.current.updateSettings({
          streaming: {
            abr: {
              autoSwitchBitrate: {
                video: true,
              },
            },
          },
        });
        setCurrentQualityIndex(-1);
        setCurrentQuality('自动');
        updateQualityList();
      } else {
        const targetQuality = availableQualities.find((q) => q.index === index);
        if (!targetQuality) return;

        setSwitchMessage(`正在切换到 ${targetQuality.label}, 请稍等...`);
        setTimeout(() => setSwitchMessage(''), 2000);

        try {
          playerRef.current.updateSettings({
            streaming: {
              abr: {
                autoSwitchBitrate: {
                  video: false,
                },
              },
            },
          });

          playerRef.current.setRepresentationForTypeByIndex('video', index, false);
          setCurrentQualityIndex(index);
          setCurrentQuality(targetQuality.label);
          setCurrentAutoQuality('');
        } catch (err) {
          console.error('切换清晰度失败：', err);
          playerRef.current.updateSettings({
            streaming: {
              abr: {
                autoSwitchBitrate: {
                  video: true,
                },
              },
            },
          });
          setCurrentQualityIndex(-1);
          setCurrentQuality('自动');
          setSwitchMessage('');
        }
      }

      if (wasPlaying && videoPlayerRef.current) {
        videoPlayerRef.current.play().catch((err) => console.warn('切换后播放失败：', err));
      }
    };

    const handleMouseMove = () => {
      setShowControls(true);
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
      hideControlsTimer.current = window.setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    const hideControlsFn = () => {
      if (isPlaying) {
        setShowControls(false);
      }
    };

    const updateProgress = () => {
      if (!videoPlayerRef.current) return;
      setCurrentTime(videoPlayerRef.current.currentTime);
      setDuration(videoPlayerRef.current.duration);
      setPlayedPercent((videoPlayerRef.current.currentTime / videoPlayerRef.current.duration) * 100 || 0);

      const buffered = videoPlayerRef.current.buffered;
      if (buffered.length > 0) {
        const bufferedEnd = buffered.end(buffered.length - 1);
        setBufferedPercent((bufferedEnd / videoPlayerRef.current.duration) * 100 || 0);
      }
    };

    const revokePreviousBlobUrl = () => {
      if (previousBlobUrl.current) {
        URL.revokeObjectURL(previousBlobUrl.current);
        previousBlobUrl.current = null;
      }
    };

    const initPlayer = () => {
      if (!videoPlayerRef.current) {
        onError?.(new Error('视频元素未初始化'));
        return;
      }
      if (playerRef.current) {
        destroyPlayer();
      }
      playerRef.current = dashJs.MediaPlayer().create();
      playerRef.current.updateSettings({
        streaming: {
          abr: {
            autoSwitchBitrate: {
              video: true,
              audio: true,
            },
          },
        },
      });
      playerRef.current.on(dashJs.MediaPlayer.events.ERROR, (e: unknown) => {
        console.error('dash.js 播放错误:', e);
        const error = new Error(`播放错误: ${e}`);
        onError?.(error);
      });
      playerRef.current.on(dashJs.MediaPlayer.events.PLAYBACK_ENDED, () => {
        onEnded?.();
        setIsPlaying(false);
      });
      playerRef.current.on(dashJs.MediaPlayer.events.STREAM_INITIALIZED, () => {
        const videoReps = playerRef.current?.getRepresentationsByType('video') || [];
        const newQualities: Quality[] = [];
        formatListRef.current.forEach((item) => {
          if (item.id && item.codecs) {
            const repIndex = videoReps.findIndex((rep) => Number(rep.id) === item.id);
            if (repIndex !== -1) {
              newQualities.push({
                index: repIndex,
                label: item.new_description,
                id: item.id,
                needLogin: false,
              });
            }
          } else if (!isLoggedIn && item.id < 112) {
            newQualities.push({
              index: item.id,
              label: item.new_description,
              id: item.id,
              needLogin: true,
            });
          }
        });

        setAvailableQualities(newQualities);
        updateQualityList();
      });
      playerRef.current.on(dashJs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, (event) => {
        if (currentQualityIndex === -1) {
          updateQualityList();
        }
        const { newRepresentation, oldRepresentation } = event;
        if (newRepresentation && oldRepresentation) {
          if (newRepresentation.index !== oldRepresentation.index) {
            const quality = formatListRef.current.find(q => q.id === Number(newRepresentation.id));
            if (quality) {
              setSwitchMessage(`已经切换到 ${quality.new_description}`);
              setTimeout(() => setSwitchMessage(''), 1500);
            }
          }
        }
      });
      playerRef.current.initialize(videoPlayerRef.current, options.src, autoPlay);
      onLoaded?.(playerRef.current);
    };

    const handleMetadataLoadedAfterQualityChange = () => {
      if (videoPlayerRef.current) {
        setDuration(videoPlayerRef.current.duration);
        videoPlayerRef.current.removeEventListener('loadedmetadata', handleMetadataLoadedAfterQualityChange);
      }
    };

    const destroyPlayer = () => {
      if (playerRef.current) {
        try {
          // 先移除所有事件监听器
          playerRef.current.reset();
          playerRef.current = null;
        } catch (error) {
          console.warn('销毁播放器时发生错误:', error);
        }
      }
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
        hideControlsTimer.current = null;
      }
      revokePreviousBlobUrl();
    };

    const updateSrc = (newSource: Source) => {
      if (!playerRef.current) {
        initPlayer();
      }
      if (!playerRef.current) {
        onError?.(new Error('播放器未初始化'));
        return;
      }
      if (!newSource.src) {
        onError?.(new Error('视频源地址不能为空'));
        return;
      }

      revokePreviousBlobUrl();
      playerRef.current.attachSource(newSource.src);
    };

    useEffect(() => {
      if (options?.src) {
        updateSrc(options);
      }
    }, [options]);

    useImperativeHandle(ref, () => ({
      updateSrc,
      getPlayer: () => playerRef.current,
      play: () => videoPlayerRef.current?.play(),
      pause: () => videoPlayerRef.current?.pause(),
    }));

    const handleLoginSuccess = () => {
      setShowLoginModal(false);
      onLoginSuccess?.();
      setIsLoggedIn(true);
      refetchManifest();
    };

    useEffect(() => {
      if (!videoPlayerRef.current) return;

      videoPlayerRef.current.volume = volume;

      const handlePlay = () => {
        setIsPlaying(true);
        onPlay?.();
      };

      const handlePause = () => {
        setIsPlaying(false);
        onPause?.();
      };

      const handleLoadedMetadata = () => {
        setDuration(videoPlayerRef.current?.duration || 0);
      };

      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };

      videoPlayerRef.current.addEventListener('play', handlePlay);
      videoPlayerRef.current.addEventListener('pause', handlePause);
      videoPlayerRef.current.addEventListener('timeupdate', updateProgress);
      videoPlayerRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      document.addEventListener('fullscreenchange', handleFullscreenChange);

      return () => {
        if (videoPlayerRef.current) {
          videoPlayerRef.current.removeEventListener('play', handlePlay);
          videoPlayerRef.current.removeEventListener('pause', handlePause);
          videoPlayerRef.current.removeEventListener('timeupdate', updateProgress);
          videoPlayerRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
          videoPlayerRef.current.removeEventListener('loadedmetadata', handleMetadataLoadedAfterQualityChange);
        }
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        if (hideControlsTimer.current) {
          clearTimeout(hideControlsTimer.current);
          hideControlsTimer.current = null;
        }
        destroyPlayer();

        if (videoPlayerRef.current) {
          videoPlayerRef.current.src = '';;
          videoPlayerRef.current.load()
        }
      };
    }, [onPlay, onPause, onEnded, onError, onLoaded, autoPlay, options.src]);

    const messagePosition = showControls ? 'bottom-24' : 'bottom-8';

    const getProgress = () => {
      const el = videoPlayerRef.current;
      if (!el) {
        return { currentTime: 0, duration: 0, paused: true, ended: false };
      }
      return {
        currentTime: Number(el.currentTime || 0),
        duration: Number(el.duration || 0),
        paused: el.paused,
        ended: el.ended,
      };
    }
    const askAI = () => {
      const p = getProgress();
      console.log('用户手动获取播放进度：', p);

      // Use player's current playback progress (seconds) and format as HH:MM:SS
      const progress = getProgress();
      const currentSeconds = Math.max(0, Math.floor(progress?.currentTime ?? 0));
      const pad = (n: number) => n.toString().padStart(2, '0');
      const hh = pad(Math.floor(currentSeconds / 3600));
      const mm = pad(Math.floor((currentSeconds % 3600) / 60));
      const ss = pad(currentSeconds % 60);
      const timeStr = `${hh}:${mm}:${ss}`;
      const text = `对于当前时间点：${timeStr}，我有以下问题：\n`;

      sendToAI(text)
    }

    return (
      <div className="flex flex-col gap-4">
        <div
          className="relative overflow-hidden bg-black rounded-lg"
          onMouseMove={handleMouseMove}
          onMouseLeave={hideControlsFn}
        >
          <video
            ref={videoPlayerRef}
            id={playerIdRef.current}
            className="w-full h-full object-contain bg-black"
            style={{ width: containerWidth, height: containerHeight }}
            onClick={togglePlay}
          />

          {/* 字幕显示 */}
          {showSubtitles && currentSubtitle && (
            <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none px-4">
              <div className="bg-black/80 backdrop-blur-sm text-white px-6 py-3 rounded-lg text-lg font-medium max-w-4xl text-center shadow-lg">
                {currentSubtitle}
              </div>
            </div>
          )}

          {switchMessage && (
            <div className={`absolute ${messagePosition} left-4 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg z-50 transition-all duration-300 shadow-lg`}>
              {switchMessage}
            </div>
          )}

          <VideoControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            isMuted={isMuted}
            isFullscreen={isFullscreen}
            isPiPSupported={isPiPSupported}
            bufferedPercent={bufferedPercent}
            playedPercent={playedPercent}
            currentSpeed={playbackSpeed}
            qualities={availableQualities}
            currentQualityIndex={currentQualityIndex}
            currentQuality={currentQuality}
            currentAutoQuality={currentAutoQuality}
            showControls={showControls}
            showSubtitles={showSubtitles}
            hasSubtitles={subtitles !== undefined && subtitles.length > 0}
            onTogglePlay={togglePlay}
            onSeek={seek}
            onVolumeChange={handleVolumeChange}
            onToggleMute={toggleMute}
            onSpeedChange={handleSpeedChange}
            onQualityChange={changeQuality}
            onLoginClick={() => setShowLoginModal(true)}
            onToggleFullscreen={toggleFullscreen}
            onTogglePiP={togglePiP}
            onSubtitleToggle={handleSubtitleToggle}
          />
        </div>
        <div className="flex gap-4 justify-end">
          <button type="button" className="w-24 h-8 p-0 bg-transparent border-0 flex items-center justify-center cursor-pointer focus:outline-none">
            <img src={aiVideoAssistantImg} alt="AI视频助手" className="max-w-full max-h-full" />
          </button>
          <button type="button" className="w-22 h-8 p-0 bg-transparent border-0 flex items-center justify-center cursor-pointer focus:outline-none" onClick={askAI}>
            <img src={questionHereImg} alt="这里不懂" className="max-w-full max-h-full" />
          </button>
        </div>
        <BilibiliLoginModal visible={showLoginModal} onClose={() => setShowLoginModal(false)} onSuccess={handleLoginSuccess} />
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
