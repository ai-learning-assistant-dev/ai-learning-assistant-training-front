/**
 * FastRTC 消息类型和接口定义
 */

export type MessageType =
  | "send_input"
  | "fetch_output"
  | "stopword"
  | "error"
  | "warning"
  | "log";

export interface Message {
  type: MessageType;
  data: string | object;
}

export interface WebRTCError {
  status: string;
  meta?: {
    error: string;
    limit?: number;
  };
}

export type Subtitle =
  | {
      type: "request"; //request表示用户语音识别字幕
      timestamp: "";
      text: string;
    }
  | {
      type: "response"; //response表示AI响应字幕
      timestamp: number; //秒级时间戳（相对时间，0视为音频段开始）
      text: string;
    };

/**
 * 可视化配置
 */
export interface VisualizerConfig {
  /** 输入音频可视化容器 ID（用户麦克风） */
  inputContainerId?: string;
  /** 输出音频可视化容器 ID（AI 声音） */
  outputContainerId?: string;
}
export interface LLMMetadata {
  userId: string;
  sessionId: string;
  sectionId: string;
  personaId?: string;
}

/**
 * FastRTC 客户端配置
 */
export interface FastRTCClientConfig {
  /** 服务器地址 */
  serverUrl: string;
  /** ICE 服务器配置 */
  iceServers?: RTCIceServer[];
  /** LLM 必要配置 */
  llmMetadata: LLMMetadata;
  /** 音频可视化配置（可选） */
  visualizer?: VisualizerConfig;
}
/**
 * FastRTC 客户端事件类型定义
 */
export interface FastRTCClientEvents {
  /** 连接成功 */
  connect: undefined;
  /** 连接断开 */
  disconnect: undefined;
  /** 收到消息 */
  message: Message;
  /** 发生错误 */
  error: string;
  /** 日志信息 */
  log: string;
  /** 字幕信息 */
  subtitle: Subtitle;
  /** 连接状态变化 */
  connectionStateChange: RTCPeerConnectionState;
  /** ICE 连接状态变化 */
  iceConnectionStateChange: RTCIceConnectionState;
  /** 接收到音频轨道 */
  track: MediaStream;
  /** 数据通道打开 */
  dataChannelOpen: undefined;
  /** 数据通道关闭 */
  dataChannelClose: undefined;
}
