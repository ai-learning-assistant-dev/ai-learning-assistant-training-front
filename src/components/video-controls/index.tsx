import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Subtitles,
  CircleHelp
} from 'lucide-react';
import { useState } from 'react';
import { Slider } from '@/components/ui/slider';



export interface Quality {
  index: number;
  label: string;
  needLogin: boolean;
  id: number;
}


// Progress Bar Component
interface ProgressBarProps {
  bufferedPercent: number;
  playedPercent: number;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ bufferedPercent, playedPercent, onSeek }) => (
  <div className="relative h-[5px] bg-white/30 cursor-pointer mb-[10px] rounded-[3px] hover:h-[7px] group" onClick={onSeek}>
    <div className="absolute h-full bg-white/50 rounded-[3px] transition-[width] duration-200" style={{ width: `${bufferedPercent}%` }} />
    <div className="absolute h-full bg-[#00AEEC] rounded-[3px] transition-[width] duration-100" style={{ width: `${playedPercent}%` }}>
      <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-[12px] h-[12px] bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg" />
    </div>
  </div>
);

// Volume Control Component with shadcn Slider
interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}
const VolumeControl: React.FC<VolumeControlProps> = ({ volume, isMuted, onVolumeChange, onToggleMute }) => {

  const [isHovering, setIsHovering] = useState(false);
  const handleValueChange = (value: number[]) => {
    onVolumeChange(value[0]);
  };

  return (
    <div
      className="relative flex items-center group"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}>
      <button
        className="bg-none border-none text-white cursor-pointer p-[8px] flex items-center gap-[5px] transition-opacity duration-200 hover:opacity-80"
        onClick={onToggleMute}
        title={isMuted ? '取消静音' : '静音'}
      >
        {!isMuted && volume > 0.5 ? (
          <Volume2 className="w-6 h-6" />
        ) : !isMuted && volume > 0 ? (
          <Volume1 className="w-6 h-6" />
        ) : (
          <VolumeX className="w-6 h-6" />
        )}
      </button>
      <div 
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 backdrop-blur-sm p-4 rounded-lg shadow-2xl transition-all duration-200 ${
          isHovering ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          {/* Volume Percentage */}
          <div className="text-white text-sm font-semibold min-w-[40px] text-center">
            {Math.round(volume * 100)}%
          </div>

          {/* Vertical Slider */}
          <div className="h-[120px]">
            <Slider
              value={[volume]}
              onValueChange={handleValueChange}
              max={1}
              step={0.01}
              orientation="vertical"
              className="min-h-0!"
              style={{
                '--slider-track-bg': 'rgba(255, 255, 255, 0.2)',
                '--primary': '#00AEEC',
                '--slider-thumb-bg': '#ffffff',
              } as React.CSSProperties}
            />
          </div>
        </div>
      </div>
    </div>)

};

// Playback Speed Menu Component
interface PlaybackSpeedMenuProps {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const PlaybackSpeedMenu: React.FC<PlaybackSpeedMenuProps> = ({ currentSpeed, onSpeedChange }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      <button
        className="bg-none border-none text-white cursor-pointer p-[8px] flex items-center gap-[5px] transition-opacity text-[15px] duration-200 hover:opacity-80"
        title={`播放速度: ${currentSpeed}x`}
      >
        倍速
      </button>
      {showMenu && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-sm rounded-[8px] p-[5px_0] text-[12px] shadow-xl text-center">
          {PLAYBACK_SPEEDS.map((speed) => (
            <div
              key={speed}
              className={`px-[16px] h-[32px] whitespace-nowrap cursor-pointer flex justify-center items-center hover:bg-white/10 transition-colors ${speed === currentSpeed ? 'text-[#00a1d6] bg-white/5' : 'text-white'
                }`}
              onClick={() => onSpeedChange(speed)}
            >
              <span>{speed}x</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Subtitle Menu Component
interface SubtitleMenuProps {
  showSubtitles: boolean;
  hasSubtitles: boolean;
  onSubtitleToggle: (show: boolean) => void;
}

const SubtitleMenu: React.FC<SubtitleMenuProps> = ({ showSubtitles, hasSubtitles, onSubtitleToggle }) => {
  const [showMenu, setShowMenu] = useState(false);

  // 如果没有字幕，不显示菜单
  if (!hasSubtitles) {
    return null;
  }

  const subtitleOptions = [
    { label: '无', value: false },
    { label: '中文', value: true }
  ];

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      <button
        className="bg-none border-none text-white cursor-pointer p-[8px] flex items-center gap-[5px] transition-opacity duration-200 hover:opacity-80"
        title={showSubtitles ? '字幕: 中文' : '字幕: 无'}
      >
        <Subtitles className={`w-6 h-6 ${showSubtitles ? 'text-[#00AEEC]' : ''}`} />
      </button>
      {showMenu && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-sm rounded-[8px] p-[5px_0] text-[14px] shadow-xl min-w-[100px]">
          {subtitleOptions.map((option) => (
            <div
              key={option.label}
              className={`px-[16px] h-[32px] whitespace-nowrap cursor-pointer flex justify-between items-center hover:bg-white/10 transition-colors ${option.value === showSubtitles ? 'text-[#00a1d6] bg-white/5' : 'text-white'
                }`}
              onClick={() => onSubtitleToggle(option.value)}
            >
              <span>{option.label}</span>
              {option.value === showSubtitles && <span className="text-[#00a1d6] ml-2">✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Quality Menu Component
export interface QualityMenuProps {
  qualities: Quality[];
  currentQualityIndex: number;
  currentQuality: string;
  currentAutoQuality: string;
  onQualityChange: (index: number) => void;
  onLoginClick: (quality: Quality) => void;
}

const QualityMenu: React.FC<QualityMenuProps> = ({
  qualities,
  currentQualityIndex,
  currentQuality,
  currentAutoQuality,
  onQualityChange,
  onLoginClick
}) => {
  const [showMenu, setShowMenu] = useState(false);

  
  // 获取自动选项显示文本
  const getAutoText = () => {
    if (currentAutoQuality) {
      return `自动(${currentAutoQuality})`;
    }
    return '自动';
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      <button
        className="bg-none border-none text-white cursor-pointer p-[8px] flex items-center gap-[5px] transition-opacity duration-200 hover:opacity-80"
        title={`清晰度: ${currentQuality}`}
      >
        <span className="text-[15px]">{currentQuality}</span>
      </button>
      {showMenu && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-sm rounded-[8px] p-[5px_0] text-[12px] shadow-xl">
          {qualities.map((quality) => (
            <div
              key={quality.index}
              className={`px-[12px] h-[32px] whitespace-nowrap cursor-pointer w-[169px] flex justify-between items-center hover:bg-white/10 transition-colors ${quality.index === currentQualityIndex ? 'text-[#00a1d6] bg-white/5' : 'text-white'
                }`}
              onClick={() => !quality.needLogin && onQualityChange(quality.index)}
            >
              <span>{quality.label}</span>
              <span>
                {quality.needLogin && (
                  <span
                    className="rounded-[8px] box-border h-[16px] leading-[16px] px-[5px] border border-[#f25d8e] text-[#f25d8e] cursor-pointer text-[12px] whitespace-nowrap hover:bg-[#f25d8e]/10"
                    onClick={(e) => {
                      onLoginClick(quality);
                      e.stopPropagation();
                    }}
                  >
                    登录即享
                  </span>
                )}
              </span>
            </div>
          ))}
          <div
            className={`px-[12px] h-[32px] whitespace-nowrap cursor-pointer w-[169px] flex justify-between items-center hover:bg-white/10 transition-colors ${currentQualityIndex === -1 ? 'text-[#00a1d6] bg-white/5' : 'text-white'
              }`}
            onClick={() => onQualityChange(-1)}
          >
            <span>{getAutoText()}</span>
            {currentQualityIndex === -1 && <span className="text-[#00a1d6]">✓</span>}
          </div>
        </div>
      )}
    </div>
  );
};




// Video Controls Component
interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  isPiPSupported: boolean;
  bufferedPercent: number;
  playedPercent: number;
  currentSpeed: number;
  qualities: Quality[];
  currentQualityIndex: number;
  currentQuality: string;
  currentAutoQuality: string;
  showControls: boolean;
  showSubtitles: boolean;
  hasSubtitles: boolean;
  onTogglePlay: () => void;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onSpeedChange: (speed: number) => void;
  onQualityChange: (index: number) => void;
  onLoginClick: (quality: Quality) => void;
  onToggleFullscreen: () => void;
  onTogglePiP: () => void;
  onSubtitleToggle: (show: boolean) => void;
  onAskAI?: () => void;
}

const VideoControls: React.FC<VideoControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isFullscreen,
  isPiPSupported,
  bufferedPercent,
  playedPercent,
  currentSpeed,
  qualities,
  currentQualityIndex,
  currentQuality,
  currentAutoQuality,
  showControls,
  showSubtitles,
  hasSubtitles,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onSpeedChange,
  onQualityChange,
  onLoginClick,
  onToggleFullscreen,
  onTogglePiP,
  onSubtitleToggle,
  onAskAI
}) => {
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-[20px_10px_10px] transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'
        } hover:opacity-100`}
    >
      <ProgressBar
        bufferedPercent={bufferedPercent}
        playedPercent={playedPercent}
        onSeek={onSeek}
      />

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-[10px]">
          <button
            className="bg-none border-none text-white cursor-pointer p-[8px] flex items-center gap-[5px] transition-opacity duration-200 hover:opacity-80"
            onClick={onTogglePlay}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>

          <VolumeControl
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={onVolumeChange}
            onToggleMute={onToggleMute}
          />

          <span className="text-white text-[14px] select-none font-medium">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {onAskAI && (
            <button
              className="bg-none border-none text-white cursor-pointer p-[8px] flex items-center gap-[5px] transition-opacity duration-200 hover:opacity-80"
              onClick={onAskAI}
              title="这里不懂"
            >
              <CircleHelp className="w-5 h-5" />
              <span className="text-[13px]">这里不懂</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-[10px]">
          <SubtitleMenu
            showSubtitles={showSubtitles}
            hasSubtitles={hasSubtitles}
            onSubtitleToggle={onSubtitleToggle}
          />

          <QualityMenu
            qualities={qualities}
            currentQualityIndex={currentQualityIndex}
            currentQuality={currentQuality}
            currentAutoQuality={currentAutoQuality}
            onQualityChange={onQualityChange}
            onLoginClick={onLoginClick}
          />

          <PlaybackSpeedMenu
            currentSpeed={currentSpeed}
            onSpeedChange={onSpeedChange}
          />

          {isPiPSupported && (
            <button
              className="bg-none border-none text-white cursor-pointer p-[8px] flex items-center gap-[5px] transition-opacity duration-200 hover:opacity-80"
              onClick={onTogglePiP}
              title="画中画"
            >
              <PictureInPicture2 className="w-6 h-6" />
            </button>
          )}

          <button
            className="bg-none border-none text-white cursor-pointer p-[8px] flex items-center gap-[5px] transition-opacity duration-200 hover:opacity-80"
            onClick={onToggleFullscreen}
            title={isFullscreen ? '退出全屏' : '全屏'}
          >
            {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
};


export default VideoControls;
