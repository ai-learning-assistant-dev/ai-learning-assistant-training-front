import { useEffect, useRef, useState, useCallback } from 'react';
import { MicIcon, MicOffIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FastRTCClient, type Subtitle } from '@/lib/rtc-client';

type VoiceUIProps = {
  userId: string;
  sessionId: string;
  sectionId: string;
  personaId?: string;
  serverUrl: string;
  onClose: () => void;
};

type SubtitleItem = {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: number;
};

export const VoiceUI = ({ userId, sessionId, sectionId, personaId, serverUrl, onClose }: VoiceUIProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');

  const rtcClientRef = useRef<FastRTCClient | null>(null);

  // 初始化 WebRTC 连接
  useEffect(() => {
    // 防止重复初始化：如果已经有实例，直接返回
    if (rtcClientRef.current) {
      console.log('✅ FastRTCClient 实例已存在，跳过初始化');
      return;
    }

    const initRTC = async () => {
      try {
        // 确保 DOM 元素已经渲染
        const inputContainer = document.getElementById('input-visualizer');
        const outputContainer = document.getElementById('output-visualizer');

        if (!inputContainer) {
          throw new Error('Input visualizer container not found. DOM may not be ready.');
        }
        if (!outputContainer) {
          throw new Error('Output visualizer container not found. DOM may not be ready.');
        }

        console.log('🚀 开始创建 FastRTCClient 实例');
        const client = new FastRTCClient({
          serverUrl,
          llmMetadata: {
            userId,
            sessionId,
            sectionId,
            personaId,
            daily: !sectionId,
          },
          visualizer: {
            inputContainerId: 'input-visualizer',
            outputContainerId: 'output-visualizer',
          },
        });

        // 先保存实例引用，防止重复创建
        rtcClientRef.current = client;
        console.log('✅ FastRTCClient 实例已创建并保存到 ref');

        client.on('log', (message: string) => {
          console.log('FastRTCClient Log:', message);
        });

        // 监听连接状态
        client.on('connect', () => {
          setIsConnected(true);
          setConnectionState('connected');
        });

        client.on('disconnect', () => {
          setIsConnected(false);
          setConnectionState('disconnected');
        });

        client.on('connectionStateChange', state => {
          setConnectionState(state);
        });

        // 监听字幕
        client.on('subtitle', (subtitle: Subtitle) => {
          const newSubtitle: SubtitleItem = {
            id: `${Date.now()}-${Math.random()}`,
            type: subtitle.type === 'request' ? 'user' : 'assistant',
            text: subtitle.text,
            timestamp: Date.now(),
          };

          if (subtitle.type === 'request') {
            // 用户语音识别字幕 - 实时更新
            setCurrentSubtitle(subtitle.text);
            setSubtitles(prev => [...prev, newSubtitle]);
          } else {
            // AI 响应字幕
            setCurrentSubtitle(subtitle.text);
            setSubtitles(prev => [...prev, newSubtitle]);
          }
        });

        // 监听错误
        client.on('error', error => {
          console.error('RTC Error:', error);
          setConnectionState('failed');
        });

        // 连接到服务器
        setConnectionState('connecting');
        await client.connect();
        console.log('✅ FastRTCClient 已连接到服务器');
      } catch (error) {
        setConnectionState('failed');
        console.error('❌ Failed to initialize RTC:', error);
        // 如果初始化失败，清除 ref
        rtcClientRef.current = null;
      }
    };

    initRTC();

    // 清理函数 - 只在组件卸载时执行
    return () => {
      console.log('🔴 VoiceUI 组件卸载，清理 FastRTCClient');
    };
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // 处理麦克风静音
  const toggleMute = useCallback(() => {
    if (rtcClientRef.current) {
      const newMutedState = rtcClientRef.current.toggleMute();
      setIsMuted(newMutedState);
    }
  }, []);

  // 获取状态颜色和文本
  const getStateInfo = () => {
    switch (connectionState) {
      case 'connected':
        return { text: '已连接 - 可以说话' };
      case 'connecting':
        return { text: '正在连接...' };
      case 'disconnected':
        return { text: '未连接' };
      case 'failed':
        return { text: '发生错误，请退出重试。' };
      default:
        return { text: connectionState };
    }
  };

  // 监听连接状态变化
  useEffect(() => {
    // console.log("connectionState", connectionState);
    const info = getStateInfo();
    setCurrentSubtitle(info.text);
    setSubtitles(prev => {
      if (prev.length > 0 && prev[prev.length - 1].text === info.text) return prev;

      const newSubtitle: SubtitleItem = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'assistant',
        text: info.text,
        timestamp: Date.now(),
      };

      return [...prev, newSubtitle];
    });
  }, [connectionState]);

  const closeVoice = useCallback(async () => {
    if (rtcClientRef.current) {
      await rtcClientRef.current.disconnect();
      rtcClientRef.current = null;
    }
    onClose();
  }, [onClose]);

  return (
    <div className='flex-1 flex flex-col pl-8 pr-8 relative'>
      {/* Main Voice Interface */}
      <div className='flex-1 flex flex-col items-center justify-between gap-1'>
        {/* AI 语音输出可视化圆球 (背景透明) */}
        <div className='relative'>
          <div className={cn('w-40 h-40 flex items-center justify-center')}>
            <div id='output-visualizer' className='w-full h-full' />
          </div>
        </div>

        {/* 用户语音输入波形 (背景透明) */}
        <div className='w-full max-w-md'>
          <div id='input-visualizer' className='h-32 w-full' />
        </div>

        {/* 字幕显示区域 */}
        <div className='w-full max-w-2xl'>
          <div className='bg-white rounded-lg border border-gray-200 shadow-sm p-4 min-h-[200px] max-h-[400px] overflow-y-auto'>
            <div className='text-xs text-gray-400 mb-2'>实时字幕</div>

            {/* 上一句字幕 - 较小、较淡 */}
            {subtitles.length > 0 && <div className='text-sm text-gray-400 mb-4 pb-4 border-b border-gray-100'>{subtitles[subtitles.length - 2]?.text?.trim() || ''}</div>}

            {/* 当前字幕 - 较大、较深 */}
            <div className='text-base text-gray-900 whitespace-pre-wrap'>{currentSubtitle?.trim() || '等待语音输入...'}</div>
          </div>
        </div>

        {/* 控制按钮 - Fixed at bottom */}
        <div className='flex gap-3 justify-center pb-4'>
          <Button variant='outline' size='icon' onClick={toggleMute} disabled={!isConnected} className={cn('w-12 h-12 rounded-full', isMuted && 'bg-red-100 hover:bg-red-200')}>
            {isMuted ? <MicOffIcon className='h-5 w-5 text-red-600' /> : <MicIcon className='h-5 w-5' />}
          </Button>

          <Button variant='destructive' size='icon' onClick={closeVoice} className='w-12 h-12 rounded-full' disabled={!['failed', 'connected'].includes(connectionState)}>
            <XIcon className='h-5 w-5' />
          </Button>
        </div>
      </div>
    </div>
  );
};
