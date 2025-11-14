import React, { useState, useEffect, useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import * as dashJs from 'dashjs';
import { uniqueId } from 'lodash';
import type { MediaPlayerClass } from 'dashjs';
import BilibiliLoginModal from "@/components/bilibili-login-modal";
import { serverHost } from '@/server/training-server';
import aiVideoAssistantImg from './ai_video_assistant.png'
import questionHereImg from './question_here.png'

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

interface PlayerProps {
  url?: string;
  autoPlay?: boolean;
  width?: string;
  height?: string;
  onError?: (error: Error) => void;
  onLoaded?: (player: MediaPlayerClass) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onLoginSuccess?: () => void;
}

interface Quality {
  index: number;
  label: string;
  needLogin: boolean;
  id: number;
}

export interface VideoPlayerRef {
  updateSrc: (newSource: Source) => void;
  getPlayer: () => MediaPlayerClass | null;
  play: () => void;
  pause: () => void;
}

function getBilibiliProxy(bilibiliUrl: string): string {
  if (!bilibiliUrl) return `${serverHost}/proxy/bilibili/video-manifest?bvid=`;
  try {
    // Prefer using the URL API to correctly extract the pathname segments
    const urlObj = new URL(bilibiliUrl);
    const parts = urlObj.pathname.split('/').filter(Boolean);
    const bvid = parts.length > 0 ? parts[parts.length - 1] : '';
    return `${serverHost}/proxy/bilibili/video-manifest?bvid=${encodeURIComponent(bvid)}`;
  } catch (err: unknown) {
    console.error('Error parsing URL:', err);
    // Fallback for relative URLs or non-standard inputs
    const parts = bilibiliUrl.split('/').filter(Boolean);
    const bvid = parts.length > 0 ? parts[parts.length - 1] : '';
    return `${serverHost}/proxy/bilibili/video-manifest?bvid=${encodeURIComponent(bvid)}`;
  }
}

export const VideoPlayer = forwardRef<VideoPlayerRef, PlayerProps>(
  (
    {
      url,
      autoPlay = false,
      width = '100%',
      height = 'auto',
      onError,
      onLoaded,
      onPlay,
      onPause,
      onEnded,
      onLoginSuccess,
    },
    ref
  ) => {
    const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
    const [options, setOptions] = useState<Source>({
      src: '',
      type: 'application/dash+xml'
    });

    const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
    const playerRef = useRef<MediaPlayerClass | null>(null);
    const playerIdRef = useRef<string>(uniqueId('video-'));

    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [bufferedPercent, setBufferedPercent] = useState<number>(0);
    const [playedPercent, setPlayedPercent] = useState<number>(0);
    const [volume, setVolume] = useState<number>(1);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [showControls, setShowControls] = useState<boolean>(true);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

    const [formatListTwo, setFormatListTwo] = useState<FormatItem[]>([]);

    const [availableQualities, setAvailableQualities] = useState<Quality[]>([]);
    const [currentQualityIndex, setCurrentQualityIndex] = useState<number>(-1);
    const [currentQuality, setCurrentQuality] = useState<string>('自动');
    const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);

    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

    const hideControlsTimer = useRef<number | null>(null);
    const previousBlobUrl = useRef<string | null>(null);

    const containerWidth = useMemo(() => {
      return width.includes('%') || width.includes('px') ? width : `${width}px`;
    }, [width]);

    const containerHeight = useMemo(() => {
      return height.includes('%') || height.includes('px') ? height : `${height}px`;
    }, [height]);

    const refetchManifest = () => {
      if (!url) return;

      fetch(getBilibiliProxy(url))
        .then(res => res.json())
        .then(data => {
          const xmlString = data.data.unifiedMpd;

          setFormatListTwo(data.data.formatList);

          const xmlBlob = new Blob([xmlString], { type: 'application/dash+xml' });
          const blobUrl = URL.createObjectURL(xmlBlob);
          console.log(blobUrl);
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

    const formatTime = (seconds: number): string => {
      if (!isFinite(seconds)) return '00:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const togglePlay = () => {
      if (!videoPlayerRef.current) return;
      if (isPlaying) {
        videoPlayerRef.current.pause();
      } else {
        videoPlayerRef.current.play();
      }
    };

    const changeVolume = () => {
      if (videoPlayerRef.current) {
        videoPlayerRef.current.volume = volume;
        setIsMuted(volume === 0);
      }
    };

    const handleLogin = (quality: Quality) => {
      console.log('login: ', quality);
      setShowLoginModal(true);
    };

    const toggleMute = () => {
      if (!videoPlayerRef.current) return;
      if (isMuted) {
        videoPlayerRef.current.muted = false;
        setIsMuted(false);
        if (volume === 0) {
          setVolume(0.5);
          videoPlayerRef.current.volume = 0.5;
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

    const handleMetadataLoadedAfterQualityChange = () => {
      if (videoPlayerRef.current) {
        setDuration(videoPlayerRef.current.duration);
        console.log('清晰度切换后更新总时长:', videoPlayerRef.current.duration);
        videoPlayerRef.current.removeEventListener('loadedmetadata', handleMetadataLoadedAfterQualityChange);
      }
    };

    const updateQualityList = () => {
      if (!playerRef.current || currentQualityIndex !== -1) return;

      const videoRepresentations = playerRef.current.getRepresentationsByType('video');
      console.log('所有清晰度列表', videoRepresentations);
      if (videoRepresentations.length === 0) return;

      const currentRepresentation = playerRef.current.getCurrentRepresentationForType('video');
      if (!currentRepresentation) {
        setCurrentQuality('自动');
        return;
      }

      const currentBitrate = currentRepresentation.bandwidth;
      if (typeof currentBitrate !== 'number' || currentBitrate <= 0) {
        setCurrentQuality('自动');
        return;
      }

      if (!availableQualities.length) {
        setCurrentQuality('自动');
        return;
      }

      const matchingQuality = availableQualities.find((quality) => {
        console.log('匹配当前清晰度', quality);
        return !!quality;
      });

      setCurrentQuality(matchingQuality ? `自动 (${matchingQuality.label})` : '自动');
    };

    const changeQuality = (index: number) => {
      if (!playerRef.current || !availableQualities.length) return;

      const wasPlaying = isPlaying;
      setShowQualityMenu(false);

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
        console.log('切换手动模式清晰度', targetQuality);

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
          console.log('==切换清晰度==', index);

          playerRef.current.setRepresentationForTypeByIndex('video', index, false);

          console.log('已切换清晰度:', index);
          setCurrentQualityIndex(index);
          setCurrentQuality(targetQuality.label);
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
        }
      }

      if (videoPlayerRef.current) {
        videoPlayerRef.current.removeEventListener('loadedmetadata', handleMetadataLoadedAfterQualityChange);
        videoPlayerRef.current.addEventListener('loadedmetadata', handleMetadataLoadedAfterQualityChange);
      }

      if (wasPlaying && videoPlayerRef.current) {
        videoPlayerRef.current.play().catch((err) => console.warn('切换后播放失败：', err));
      }
    };

    const revokePreviousBlobUrl = () => {
      if (previousBlobUrl.current) {
        URL.revokeObjectURL(previousBlobUrl.current);
        previousBlobUrl.current = null;
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
      if (isPlaying && !showQualityMenu) {
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

    const initPlayer = () => {
      if (!videoPlayerRef.current) {
        onError?.(new Error('视频元素未初始化'));
        return;
      }

      if (playerRef.current) {
        destroyPlayer();
      }

      playerRef.current = dashJs.MediaPlayer().create();
      console.log('dashjs-初始化');

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
        const error = new Error(`播放错误: ${e}`);
        onError?.(error);
      });

      playerRef.current.on(dashJs.MediaPlayer.events.PLAYBACK_ENDED, () => {
        onEnded?.();
        setIsPlaying(false);
      });

      playerRef.current.on(dashJs.MediaPlayer.events.STREAM_INITIALIZED, () => {
        const videoReps = playerRef.current?.getRepresentationsByType('video') || [];
        console.log('==清晰度列表==', videoReps);

        const newQualities: Quality[] = [];

        formatListTwo.forEach((item) => {
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

      playerRef.current.on(dashJs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, () => {
        if (currentQualityIndex === -1) {
          updateQualityList();
        }
      });

      playerRef.current.initialize(videoPlayerRef.current, options.src, autoPlay);

      videoPlayerRef.current.addEventListener('play', () => {
        setIsPlaying(true);
        onPlay?.();
      });

      videoPlayerRef.current.addEventListener('pause', () => {
        setIsPlaying(false);
        onPause?.();
      });

      videoPlayerRef.current.addEventListener('timeupdate', updateProgress);
      videoPlayerRef.current.addEventListener('loadedmetadata', () => {
        setDuration(videoPlayerRef.current?.duration || 0);
      });

      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);

      console.log('dashjs-初始化完成');

      onLoaded?.(playerRef.current);
    };

    const destroyPlayer = () => {
      if (playerRef.current) {
        playerRef.current.reset();
        playerRef.current = null;
      }

      if (videoPlayerRef.current) {
        videoPlayerRef.current.removeEventListener('play', () => { });
        videoPlayerRef.current.removeEventListener('pause', () => { });
        videoPlayerRef.current.removeEventListener('timeupdate', updateProgress);
        videoPlayerRef.current.removeEventListener('loadedmetadata', handleMetadataLoadedAfterQualityChange);
      }

      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
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

      console.log('dashjs-更新源');
      revokePreviousBlobUrl();
      playerRef.current.attachSource(newSource.src);
    };

    useEffect(() => {
      if (options?.src) {
        initPlayer();
      } else {
        onError?.(new Error('未提供有效的视频源'));
      }

      return () => {
        destroyPlayer();
      };
    }, []);

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
      refetchManifest(); // Refetch to get updated qualities post-login
    };

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

      try {
        const ev = new CustomEvent('ai-insert-text', { detail: { text } });
        window.dispatchEvent(ev);
        console.log('Dispatched ai-insert-text event:', text);
      } catch (e) {
        console.warn('Could not dispatch ai-insert-text event', e);
      }
    }

    return (
      <div className="flex flex-col gap-4">

        <div
          className="relative overflow-hidden bg-black"
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

          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-[20px_10px_10px] transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'
              } hover:opacity-100`}
          >
            <div className="relative h-[5px] bg-white/30 cursor-pointer mb-[10px] rounded-[3px] hover:h-[7px]" onClick={seek}>
              <div className="absolute h-full bg-white/50 rounded-[3px] transition-[width] duration-200" style={{ width: `${bufferedPercent}%` }} />
              <div className="absolute h-full bg-[#00AEEC] rounded-[3px] transition-[width] duration-100" style={{ width: `${playedPercent}%` }}>
                <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-[12px] h-[12px] bg-white rounded-full opacity-0 transition-opacity duration-200 hover:opacity-100" />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-[10px]">
                <button className="bg-none border-none text-white cursor-pointer p-[8px] flex items-center gap-[5px] transition-opacity duration-200 hover:opacity-80" onClick={togglePlay} title={isPlaying ? '暂停' : '播放'}>
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[24px] h-[24px]">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[24px] h-[24px]">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                <div className="relative flex items-center hover:[&>.volume-slider]:block">
                  <button className="bg-none border-none text-white cursor-pointer p-[8px] flex items-center gap-[5px] transition-opacity duration-200 hover:opacity-80" onClick={toggleMute} title={isMuted ? '取消静音' : '静音'}>
                    {!isMuted && volume > 0.5 ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[24px] h-[24px]">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                      </svg>
                    ) : !isMuted && volume > 0 ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[24px] h-[24px]">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[24px] h-[24px]">
                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                      </svg>
                    )}
                  </button>
                  <div className="volume-slider absolute bottom-full left-1/2 -translate-x-1/2 bg-black/80 p-[10px] rounded-[5px] hidden">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      onInput={changeVolume}
                      className="w-[100px] cursor-pointer"
                    />
                  </div>
                </div>

                <span className="text-white text-[14px] select-none">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-[10px]">
                <div
                  className="relative"
                  onMouseEnter={() => setShowQualityMenu(true)}
                  onMouseLeave={() => setShowQualityMenu(false)}
                >
                  <button className="bg-none border-none text-white cursor-pointer p-[8px] flex items-center gap-[5px] transition-opacity duration-200 hover:opacity-80" title={`清晰度: ${currentQuality}`}>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[24px] h-[24px]">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1 .49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z" />
                    </svg>
                    <span className="text-[14px]">{currentQuality}</span>
                  </button>
                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 bg-black/90 rounded-[5px] p-[5px_0] text-[12px]">
                      <div
                        className={`px-[12px] h-[30px] whitespace-nowrap cursor-pointer w-[169px] flex justify-between items-center  hover:bg-white/10 ${currentQualityIndex === -1 ? 'text-[#00a1d6]' : 'text-white'}`}
                        onClick={() => changeQuality(-1)}
                      >
                        <span>自动</span>
                      </div>
                      {availableQualities.map((quality) => (
                        <div
                          key={quality.index}
                          className={`px-[12px] h-[30px] whitespace-nowrap cursor-pointer w-[169px] flex justify-between items-center  hover:bg-white/10 ${quality.index === currentQualityIndex ? 'text-[#00a1d6]' : 'text-white'}`}
                          onClick={() => !quality.needLogin && changeQuality(quality.index)}
                        >
                          <span>{quality.label}</span>
                          <span>
                            {quality.needLogin && (
                              <span className="rounded-[8px] box-border h-[16px] leading-[16px] px-[5px] border border-[#f25d8e] text-[#f25d8e] cursor-pointer text-[12px] whitespace-nowrap" onClick={(e) => { handleLogin(quality); e.stopPropagation(); }}>
                                登录即享
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button className="bg-none border-none text-white cursor-pointer p-[8px] flex items-center gap-[5px] transition-opacity duration-200 hover:opacity-80" onClick={toggleFullscreen} title={isFullscreen ? '退出全屏' : '全屏'}>
                  {isFullscreen ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[24px] h-[24px]">
                      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[24px] h-[24px]">
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <BilibiliLoginModal visible={showLoginModal} onClose={() => setShowLoginModal(false)} onSuccess={handleLoginSuccess} />
        </div>

        <div className="flex gap-4 justify-end">
          {/* Empty AI assistant button (left) */}
          <button type="button" className="w-24 h-8 p-0 bg-transparent border-0 flex items-center justify-center cursor-pointer focus:outline-none">
            <img src={aiVideoAssistantImg} alt="AI视频助手" className="max-w-full max-h-full" />
          </button>
          {/* Progress button replaced by image (right) */}
          <button type="button" className="w-22 h-8 p-0 bg-transparent border-0 flex items-center justify-center cursor-pointer focus:outline-none" onClick={askAI}>
            <img src={questionHereImg} alt="这里不懂" className="max-w-full max-h-full" />
          </button>
        </div>
      </div>
    );
  }
);

