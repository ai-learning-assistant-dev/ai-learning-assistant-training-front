import React, { useState, useEffect, useRef, useMemo, useImperativeHandle, forwardRef, useCallback } from 'react';
import * as dashJs from 'dashjs';
import { uniqueId } from 'lodash';
import type { MediaPlayerClass } from 'dashjs';
import { Volume2, Volume1, VolumeX } from 'lucide-react';
import { serverHost, type KnowledgePoints, type Subtitle } from '@/server/training-server';
import type { Quality } from '../video-controls';
import VideoControls from '../video-controls';
import BilibiliLoginModal from '../bilibili-login-modal';
import aiVideoAssistantImg from './ai_video_assistant.png';
import { addCitation } from '../ai-conversation';
import { AIVideoSummary } from '../ai_video_assistant';

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
  subtitles?: Subtitle[] | undefined;
  knowledge_points?: KnowledgePoints;
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
      knowledge_points = {
        key_points: [],
      },
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
      type: 'application/dash+xml',
    });
    const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [bufferedPercent, setBufferedPercent] = useState<number>(0);
    const [playedPercent, setPlayedPercent] = useState<number>(0);
    const [volume, setVolume] = useState<number>(0.7);  // 真实音量（静音时也保持）
    const [isMuted, setIsMuted] = useState<boolean>(false);  // 静音状态（与音量独立）
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
    const [showSubtitles, setShowSubtitles] = useState<boolean>(false);
    const [showKnowledgePoints, setKnowledgePoints] = useState<boolean>(false);
    
    // 字幕拖动相关状态（仅支持垂直方向拖动）
    const [subtitlePositionY, setSubtitlePositionY] = useState(0);
    const [isDraggingSubtitle, setIsDraggingSubtitle] = useState(false);
    const [dragStartY, setDragStartY] = useState(0);

    // 音量变化提示 Popup 状态
    const [valueChangeVisible, setValueChangeVisible] = useState(false);
    const [valueChangeMessage, setValueChangeMessage] = useState('');
    const [valueChangeIcon, setValueChangeIcon] = useState<React.ReactNode>(null);
    const valueChangeTimerRef = useRef<number | null>(null);
    const isInitialVolumeSetRef = useRef(true);  // 标记初始化阶段，跳过首次 volumechange

    // Refs
    const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
    const playerRef = useRef<MediaPlayerClass | null>(null);
    const playerIdRef = useRef<string>(uniqueId('video-'));
    const formatListRef = useRef<FormatItem[]>([]);
    const hideControlsTimer = useRef<number | null>(null);
    const previousBlobUrl = useRef<string | null>(null);
    const subtitleRef = useRef<HTMLDivElement | null>(null);

    // 处理字幕数据，预先转换时间为秒数
    const processedSubtitles = useMemo(() => {
      return subtitles.map(sub => ({
        ...sub,
        startTime: parseTimeToSeconds(sub.start),
        endTime: parseTimeToSeconds(sub.end),
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

      const currentSub = processedSubtitles.find(sub => currentTime >= sub.startTime && currentTime <= sub.endTime);
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
          const xmlBlob = new Blob([xmlString], {
            type: 'application/dash+xml',
          });
          const blobUrl = URL.createObjectURL(xmlBlob);
          setOptions({
            src: blobUrl,
            type: 'application/dash+xml',
          });
        })
        .catch(error => {
          console.error('Failed to fetch MPD:', error);
        });
    };

    useEffect(() => {
      refetchManifest();
    }, [url]);

    // 字幕拖动处理函数（仅垂直方向）
    const handleSubtitleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      
      // 如果是第一次拖动（位置还是默认的 0），需要计算当前实际位置
      if (subtitlePositionY === 0) {
        const subtitleElement = e.currentTarget;
        const videoElement = videoPlayerRef.current;
        if (!videoElement) return;
        
        const videoRect = videoElement.getBoundingClientRect();
        const subtitleRect = subtitleElement.getBoundingClientRect();
        
        // 计算字幕中心相对于视频中心的垂直偏移
        const videoCenterY = videoRect.top + videoRect.height / 2;
        const subtitleCenterY = subtitleRect.top + subtitleRect.height / 2;
        
        const initialY = subtitleCenterY - videoCenterY;
        
        setSubtitlePositionY(initialY);
        setDragStartY(e.clientY - initialY);
      } else {
        setDragStartY(e.clientY - subtitlePositionY);
      }
      
      setIsDraggingSubtitle(true);
    };

    const handleSubtitleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSubtitle || !videoPlayerRef.current || !subtitleRef.current) return;
      
      const videoRect = videoPlayerRef.current.getBoundingClientRect();
      const subtitleRect = subtitleRef.current.getBoundingClientRect();
      
      // 只限制垂直方向的边界
      const maxYAbs = Math.max(0, videoRect.height / 2 - subtitleRect.height / 2) - 20;
      
      let newY = e.clientY - dragStartY;
      newY = Math.max(-maxYAbs, Math.min(maxYAbs, newY));
      
      setSubtitlePositionY(newY);
    };

    const handleSubtitleMouseUp = () => {
      setIsDraggingSubtitle(false);
    };

    // 字幕拖动事件监听
    useEffect(() => {
      if (isDraggingSubtitle) {
        document.addEventListener('mousemove', handleSubtitleMouseMove);
        document.addEventListener('mouseup', handleSubtitleMouseUp);
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
      } else {
        document.removeEventListener('mousemove', handleSubtitleMouseMove);
        document.removeEventListener('mouseup', handleSubtitleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }

      return () => {
        document.removeEventListener('mousemove', handleSubtitleMouseMove);
        document.removeEventListener('mouseup', handleSubtitleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }, [isDraggingSubtitle, dragStartY, subtitlePositionY]);

    // Handlers
    const togglePlay = () => {
      if (!videoPlayerRef.current) return;
      if (isPlaying) {
        videoPlayerRef.current.pause();
      } else {
        videoPlayerRef.current.play();
      }
    };

    // 滑块显示值：静音时显示0，否则显示真实音量
    const displayVolume = isMuted ? 0 : volume;

    // 根据音量值获取对应图标
    const getVolumeIcon = (vol: number, muted: boolean) => {
      if (muted || vol === 0) return <VolumeX className="w-4 h-4 shrink-0" />;
      if (vol > 0.5) return <Volume2 className="w-4 h-4 shrink-0" />;
      return <Volume1 className="w-4 h-4 shrink-0" />;
    };

    // 显示音量变化 Popup
    const showValueChange = useCallback((message: string, icon: React.ReactNode) => {
      setValueChangeMessage(message);
      setValueChangeIcon(icon);
      setValueChangeVisible(true);

      if (valueChangeTimerRef.current) {
        clearTimeout(valueChangeTimerRef.current);
      }
      valueChangeTimerRef.current = window.setTimeout(() => {
        setValueChangeVisible(false);
      }, 2000);
    }, []);

    // 统一的音频状态设置函数（所有音量/静音操作都通过这个函数）
    const setAudioState = (nextVolume: number, nextMuted: boolean) => {
      const video = videoPlayerRef.current;
      if (!video) return;

      const clampedVolume = Math.max(0, Math.min(1, nextVolume));
      video.volume = clampedVolume;
      video.muted = nextMuted;
      setVolume(clampedVolume);
      setIsMuted(nextMuted);
    };

    // 音量滑块变化
    const handleVolumeChange = (newVolume: number) => {
      // 拖动滑块时，音量>0则取消静音，音量=0则静音
      setAudioState(newVolume, newVolume === 0);
    };

    // 切换静音状态
    const toggleMute = () => {
      if (isMuted) {
        // 取消静音：volume 已经是正确的值（静音时保持不变）
        // 如果 volume 为0，给个默认值
        const restoreVolume = volume > 0 ? volume : 0.5;
        setAudioState(restoreVolume, false);
      } else {
        // 静音：保持 volume 不变，只设置 muted
        setAudioState(volume, true);
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
      // 重置字幕位置当切换显示/隐藏时
      if (!show) {
        setSubtitlePositionY(0);
      }
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

      const matchingQuality = formatListRef.current.find(quality => {
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
        const targetQuality = availableQualities.find(q => q.index === index);
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
        videoPlayerRef.current.play().catch(err => console.warn('切换后播放失败：', err));
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
        formatListRef.current.forEach(item => {
          if (item.id && item.codecs) {
            const repIndex = videoReps.findIndex(rep => Number(rep.id) === item.id);
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
      playerRef.current.on(dashJs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, event => {
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

    // 键盘快捷键处理
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // 如果焦点在输入框等元素上，不处理快捷键
        const activeElement = document.activeElement;
        if (
          activeElement?.tagName === 'INPUT' ||
          activeElement?.tagName === 'TEXTAREA' ||
          activeElement?.getAttribute('contenteditable') === 'true'
        ) {
          return;
        }

        const video = videoPlayerRef.current;
        if (!video) return;

        switch (e.key.toLowerCase()) {
          // 空格键或K键：播放/暂停（直接操作视频元素，避免闭包问题）
          case ' ':
          case 'k':
            e.preventDefault();
            if (video.paused) {
              video.play();
            } else {
              video.pause();
            }
            break;

          // 左箭头：快退5秒
          case 'arrowleft':
            e.preventDefault();
            video.currentTime = Math.max(0, video.currentTime - 5);
            break;

          // 右箭头：快进5秒
          case 'arrowright':
            e.preventDefault();
            video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
            break;

          // 上箭头：音量增加10%（同时取消静音）
          case 'arrowup':
            e.preventDefault();
            {
              const newVol = Math.min(1, video.volume + 0.1);
              video.volume = newVol;
              video.muted = false;
              setVolume(newVol);
              setIsMuted(false);
            }
            break;

          // 下箭头：音量减少10%
          case 'arrowdown':
            e.preventDefault();
            {
              const newVol = Math.max(0, video.volume - 0.1);
              video.volume = newVol;
              // 音量为0时静音，否则取消静音
              video.muted = newVol === 0;
              setVolume(newVol);
              setIsMuted(newVol === 0);
            }
            break;

          // M键：切换静音
          case 'm':
            e.preventDefault();
            {
              if (video.muted) {
                // 取消静音：恢复到 video.volume（静音时保持不变）
                const restoreVol = video.volume > 0 ? video.volume : 0.5;
                video.muted = false;
                video.volume = restoreVol;
                setIsMuted(false);
                setVolume(restoreVol);
              } else {
                // 静音：保持 volume 不变
                video.muted = true;
                setIsMuted(true);
              }
            }
            break;

          // F键：进入/退出全屏
          case 'f':
            e.preventDefault();
            {
              const container = video.parentElement;
              if (!container) return;
              if (!document.fullscreenElement) {
                container.requestFullscreen?.();
              } else {
                document.exitFullscreen?.();
              }
            }
            break;

          // Escape键：退出全屏（浏览器默认已处理，这里作为备用）
          case 'escape':
            if (document.fullscreenElement) {
              e.preventDefault();
              document.exitFullscreen?.();
            }
            break;
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, []);  // 直接操作 video 元素，无需依赖状态

    // 监听 volumechange 事件，同步外部变化并显示 Popup
    useEffect(() => {
      const video = videoPlayerRef.current;
      if (!video) return;

      const handleVolumeChangeEvent = () => {
        const vol = video.volume;
        const muted = video.muted;
        setVolume(vol);
        setIsMuted(muted);

        // 初始化阶段不显示 Popup
        if (isInitialVolumeSetRef.current) {
          isInitialVolumeSetRef.current = false;
          return;
        }

        // 显示音量变化 Popup
        const displayVol = muted ? 0 : vol;
        const icon = getVolumeIcon(vol, muted);
        showValueChange(`${Math.round(displayVol * 100)}%`, icon);
      };

      video.addEventListener('volumechange', handleVolumeChangeEvent);
      return () => video.removeEventListener('volumechange', handleVolumeChangeEvent);
    }, [showValueChange]);

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
      };
    }, [onPlay, onPause, onEnded, onError, onLoaded, autoPlay]);

    useEffect(() => {
      return () => {
        destroyPlayer();
        if (valueChangeTimerRef.current) {
          clearTimeout(valueChangeTimerRef.current);
          valueChangeTimerRef.current = null;
        }
        if (videoPlayerRef.current) {
          videoPlayerRef.current.src = '';
          videoPlayerRef.current.load();
        }
      };
    }, []);

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
    };
    const askAI = () => {
      // 暂停视频播放
      if (videoPlayerRef.current && !videoPlayerRef.current.paused) {
        videoPlayerRef.current.pause();
      }

      const progress = getProgress();
      console.log('用户手动获取播放进度：', progress);

      const currentSeconds = Math.max(0, Math.floor(progress?.currentTime ?? 0));
      const pad = (n: number) => n.toString().padStart(2, '0');
      const hh = pad(Math.floor(currentSeconds / 3600));
      const mm = pad(Math.floor((currentSeconds % 3600) / 60));
      const ss = pad(currentSeconds % 60);
      const timeStr = `${hh}:${mm}:${ss}`;
      const text = `视频时间点：${timeStr}`;

      addCitation(text, `video-${timeStr}`);
    };

    return (
      <div className='flex flex-col gap-4'>
        <div className='w-full aspect-[16/9] relative overflow-hidden bg-black rounded-lg' onMouseMove={handleMouseMove} onMouseLeave={hideControlsFn}>
          <video
            ref={videoPlayerRef}
            id={playerIdRef.current}
            className='w-full h-full object-contain bg-black'
            style={{ width: containerWidth, height: containerHeight }}
            onClick={togglePlay}
          />

          {/* 可拖动字幕显示（仅垂直方向） */}
          {showSubtitles && currentSubtitle && (
            <div 
              className="absolute flex justify-center px-4 transition-none"
              style={{
                bottom: subtitlePositionY === 0 ? (showControls ? '5rem' : '2rem') : 'auto',
                left: 0,
                right: 0,
                top: subtitlePositionY === 0 ? 'auto' : '50%',
                transform: subtitlePositionY === 0 
                  ? 'none' 
                  : `translateY(calc(-50% + ${subtitlePositionY}px))`,
                pointerEvents: 'auto',
                zIndex: 40
              }}
            >
              <div 
                ref={subtitleRef}
                className={`group font-sans bg-[rgba(24,25,28,0.87)] py-[2px] px-[8px] leading-[1.5] text-xl relative whitespace-normal decoration-clone rounded text-white break-words select-none -mr-1 text-center transition-all ${
                  isDraggingSubtitle 
                    ? 'cursor-grabbing shadow-2xl ring-2 ring-blue-400 scale-105' 
                    : 'cursor-grab hover:shadow-xl hover:ring-1 hover:ring-blue-300/50'
                }`}
                onMouseDown={handleSubtitleMouseDown}
                title="上下拖动调整字幕位置"
              >
                {currentSubtitle}
              </div>
            </div>
          )}

          {switchMessage && (
            <div className={`absolute ${messagePosition} left-4 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg z-50 transition-all duration-300 shadow-lg`}>
              {switchMessage}
            </div>
          )}

          {/* 音量变化提示 Popup */}
          <div
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-[2] flex items-center justify-center gap-1 rounded-[5px] px-2 py-1.5 text-white text-xs w-[72px] transition-opacity duration-500 ease-in-out"
            style={{
              top: '60px',
              backgroundColor: 'rgb(0 0 0 / 70%)',
              opacity: valueChangeVisible ? 1 : 0,
            }}
          >
            {valueChangeIcon}
            <span>{valueChangeMessage}</span>
          </div>

          <VideoControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={displayVolume}
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
            onAskAI={askAI}
          />
        </div>
        <div className='flex gap-4 justify-end'>
          <AIVideoSummary
            data={knowledge_points}
            open={showKnowledgePoints}
            onOpenChange={setKnowledgePoints}
            triggerButton={
              <button type='button' className='w-24 h-8 p-0 bg-transparent border-0 flex items-center justify-center cursor-pointer focus:outline-none'>
                <img src={aiVideoAssistantImg} alt='AI视频助手' className='max-w-full max-h-full' />
              </button>
            }
          />
        </div>
        <BilibiliLoginModal visible={showLoginModal} onClose={() => setShowLoginModal(false)} onSuccess={handleLoginSuccess} />
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
