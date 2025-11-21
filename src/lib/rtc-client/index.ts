/**
 * FastRTC Frontend Library
 * 基于 Emittery 的 FastRTC WebRTC 通信库
 */

export { FastRTCClient } from "./rtc-client";
export type {
  Message,
  MessageType,
  FastRTCClientConfig,
  FastRTCClientEvents,
  WebRTCError,
  VisualizerConfig,
  Subtitle,
} from "./types";

// 音频波形可视化模块
export { InputVisualizer } from "./input-visualizer";
export { OutputVisualizer } from "./output-visualizer";
