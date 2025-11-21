import Emittery from "emittery";
import type {
  Message,
  FastRTCClientConfig,
  FastRTCClientEvents,
  Subtitle,
} from "./types";
import { InputVisualizer, OutputVisualizer } from "./index";
import hookFetch from "hook-fetch";
import { sseTextDecoderPlugin } from "hook-fetch/plugins/sse";

/**
 * 字幕管理器
 * 负责处理字幕的队列、时间延迟和优先级
 */
class SubtitleManager {
  private responseQueue: Array<{
    subtitle: Subtitle;
    timeout: ReturnType<typeof setTimeout>;
  }> = [];
  private baseTime: number = 0;
  private rtcClient: FastRTCClient;
  private apiClient: ReturnType<typeof hookFetch.create>;

  constructor(rtcClient: FastRTCClient) {
    this.rtcClient = rtcClient;
    this.apiClient = hookFetch.create<Subtitle>({
      baseURL: rtcClient.config.serverUrl,
      plugins: [
        sseTextDecoderPlugin({
          json: true, // 自动解析 JSON
          prefix: "data: ", // 移除 "data: " 前缀
          splitSeparator: "\n\n", // 事件分隔符
          lineSeparator: "\n", // 行分隔符
          trim: true, // 去除首尾空白
          doneSymbol: "[DONE]", // 结束标记
        }),
      ],
    });
  }

  /**
   * 启动字幕管理器
   * 建立 SSE 连接以接收字幕数据
   */
  async start(webrtcId: string) {
    for await (const chunk of this.apiClient
      .get(`/webrtc/text-stream?webrtc_id=${webrtcId}`)
      .stream()) {
      const subtitle = chunk.result;
      if (this.isSubtitle(subtitle)) {
        this.processSubtitle(subtitle, (s) => {
          this.rtcClient.emit("subtitle", s);
        });
      }
    }
  }

  /**
   * 检查是否为有效的字幕对象
   */
  private isSubtitle(obj: unknown): obj is Subtitle {
    if (!obj || typeof obj !== "object") return false;
    const sub = obj as Record<string, unknown>;
    return (
      (sub.type === "request" && typeof sub.text === "string") ||
      (sub.type === "response" &&
        typeof sub.timestamp === "number" &&
        typeof sub.text === "string")
    );
  }

  /**
   * 处理字幕事件
   */
  processSubtitle(subtitle: Subtitle, onEmit: (s: Subtitle) => void): void {
    if (subtitle.type === "request") {
      // request 类型直接清空队列并发送
      this.clearQueue();
      this.baseTime = Date.now();
      onEmit(subtitle);
    } else {
      // response 类型处理
      if (subtitle.timestamp === 0) {
        // timestamp 为 0，清空队列并直接发送
        this.clearQueue();
        this.baseTime = Date.now();
        onEmit(subtitle);
      } else {
        // timestamp 不为 0，添加到队列并延迟发送
        this.queueSubtitle(subtitle, onEmit);
      }
    }
  }

  /**
   * 将字幕添加到队列中
   */
  private queueSubtitle(
    subtitle: Subtitle,
    onEmit: (s: Subtitle) => void
  ): void {
    if (subtitle.type !== "response") return;

    if (this.responseQueue.length === 0) {
      this.baseTime = Date.now();
    }
    const delayMs = Math.max(
      subtitle.timestamp * 1000 -
        (Date.now() - this.baseTime) /* 相对0时间戳经过的时间 */,
      0
    );
    const timeout = setTimeout(() => {
      onEmit(subtitle);
      // 移除队列中的该项
      this.responseQueue = this.responseQueue.filter(
        (item) => item.timeout !== timeout
      );
    }, delayMs);

    this.responseQueue.push({ subtitle, timeout });
  }

  /**
   * 清空待执行的队列
   */
  private clearQueue(): void {
    this.responseQueue.forEach((item) => clearTimeout(item.timeout));
    this.responseQueue = [];
  }

  /**
   * 关闭管理器
   */
  close(): void {
    this.apiClient.abortAll();
    this.clearQueue();
  }
}

/**
 * FastRTC WebRTC 客户端
 * 基于 Emittery 的实时语音对话客户端
 */
export class FastRTCClient extends Emittery<FastRTCClientEvents> {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioOutput: HTMLAudioElement;
  private webrtcId: string = "";
  private isConnected = false;
  private inputVisualizer: InputVisualizer | null = null;
  private outputVisualizer: OutputVisualizer | null = null;
  private localStream: MediaStream | null = null;
  private subtitleManager: SubtitleManager;

  private _config: FastRTCClientConfig | null = null;
  private set config(value: FastRTCClientConfig) {
    this._config = value;
  }
  get config(): FastRTCClientConfig {
    return this._config!;
  }

  constructor(config: FastRTCClientConfig) {
    super();
    this.config = config;

    console.log("🚀 FastRTCClient 构造函数开始", {
      hasInputContainer: !!config.visualizer?.inputContainerId,
      hasOutputContainer: !!config.visualizer?.outputContainerId,
      inputContainerId: config.visualizer?.inputContainerId,
      outputContainerId: config.visualizer?.outputContainerId,
    });

    // 内部创建 Audio 元素，后台自动播放
    this.audioOutput = new Audio();
    this.audioOutput.autoplay = true;

    // 初始化字幕管理器
    this.subtitleManager = new SubtitleManager(this);

    // 立即创建可视化器（避免空屏），稍后连接音频流
    if (this.config.visualizer?.inputContainerId) {
      try {
        this.inputVisualizer = new InputVisualizer(
          this.config.visualizer.inputContainerId
        );
        console.log(
          "✅ InputVisualizer 创建成功:",
          this.config.visualizer.inputContainerId
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("❌ InputVisualizer 创建失败:", errorMsg);
        throw new Error(`Failed to create InputVisualizer: ${errorMsg}`);
      }
    } else {
      console.warn("⚠️ InputVisualizer 未配置 containerId");
    }

    if (this.config.visualizer?.outputContainerId) {
      try {
        this.outputVisualizer = new OutputVisualizer(
          this.config.visualizer.outputContainerId
        );
        console.log(
          "✅ OutputVisualizer 创建成功:",
          this.config.visualizer.outputContainerId
        );
        console.log("✅ this.outputVisualizer 状态:", {
          isNull: this.outputVisualizer === null,
          isUndefined: this.outputVisualizer === undefined,
          type: typeof this.outputVisualizer,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("❌ OutputVisualizer 创建失败:", errorMsg);
        throw new Error(`Failed to create OutputVisualizer: ${errorMsg}`);
      }
    } else {
      console.warn("⚠️ OutputVisualizer 未配置 containerId");
    }

    console.log("🎉 FastRTCClient 构造函数完成", {
      hasInputVisualizer: !!this.inputVisualizer,
      hasOutputVisualizer: !!this.outputVisualizer,
    });
  }

  /**
   * 初始化 WebRTC 连接
   */
  async connect(): Promise<void> {
    try {
      await this.post("/webrtc/metadata", {
        ...this.config.llmMetadata,
        personaId: this.config.llmMetadata.personaId ?? "",
      });
      this.generateWebRTCId();

      this.subtitleManager.start(this.webrtcId);

      const rtcConfig = this.config.iceServers
        ? { iceServers: this.config.iceServers }
        : {};

      this.peerConnection = new RTCPeerConnection(rtcConfig);
      this.setupEventListeners();

      // 获取麦克风音频流
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.localStream = stream;

      // 添加音频轨道
      stream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, stream);
      });

      // 连接输入音频可视化器到音频流（如果已创建）
      if (this.inputVisualizer) {
        this.inputVisualizer.connectStream(stream);
        this.inputVisualizer.start();
        await this.emit("log", "输入音频可视化已启动");
      }

      // 创建数据通道
      this.dataChannel = this.peerConnection.createDataChannel("text");
      this.setupDataChannel();

      // 创建并发送 offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // 发送 offer 到服务器（带重试机制）
      const response = await this.sendOfferWithRetry(offer);

      // 检查服务器返回的 Answer
      await this.emit("log", `收到服务器 Answer, type: ${response.type}`);
      console.log("Server Answer SDP:", response.sdp);

      // 检查 SDP 中是否包含音频媒体
      if (response.sdp) {
        const hasAudio = response.sdp.includes("m=audio");
        const audioDirection = response.sdp.match(
          /a=(sendrecv|sendonly|recvonly|inactive)/g
        );
        await this.emit(
          "log",
          `Answer SDP - 包含音频: ${hasAudio}, 方向: ${
            audioDirection?.join(", ") || "未指定"
          }`
        );
      }

      // 在设置远程描述之前就标记为已连接，避免 track 事件被忽略
      this.isConnected = true;

      await this.peerConnection.setRemoteDescription(response);

      await this.emit("connect");
      await this.emit("log", "已连接到服务器");

      // 检查输出可视化器的状态
      if (this.outputVisualizer) {
        await this.emit("log", "输出可视化器已创建，等待远程音频轨道...");
      } else {
        await this.emit("log", "警告: 输出可视化器未创建");
      }

      // 检查 PeerConnection 的接收器
      const receivers = this.peerConnection.getReceivers();
      await this.emit("log", `PeerConnection 接收器数量: ${receivers.length}`);
      receivers.forEach((receiver, index) => {
        console.log(`Receiver ${index}:`, {
          kind: receiver.track?.kind,
          id: receiver.track?.id,
          readyState: receiver.track?.readyState,
          enabled: receiver.track?.enabled,
        });
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.emit("error", errorMsg);
      throw error;
    }
  }

  /**
   * 关闭 WebRTC 连接
   */
  async disconnect(): Promise<void> {
    console.log("🔴 开始断开连接和清理资源");

    // 立即标记为未连接，防止事件处理器继续处理
    this.isConnected = false;

    // 先关闭 PeerConnection，停止所有事件触发
    if (this.peerConnection) {
      // 移除所有事件监听器，防止在清理过程中触发
      this.peerConnection.ontrack = null;
      this.peerConnection.ondatachannel = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onicegatheringstatechange = null;

      this.peerConnection.close();
      this.peerConnection = null;
      console.log("✅ PeerConnection 已关闭");
    }

    // 关闭数据通道
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
      console.log("✅ DataChannel 已关闭");
    }

    // 停止本地音频流
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
      console.log("✅ 本地音频流已停止");
    }

    // 销毁音频可视化器
    if (this.inputVisualizer) {
      this.inputVisualizer.stop();
      this.inputVisualizer.destroy();
      this.inputVisualizer = null;
      await this.emit("log", "输入音频可视化已销毁");
    }

    if (this.outputVisualizer) {
      this.outputVisualizer.stop();
      this.outputVisualizer.destroy();
      this.outputVisualizer = null;
      await this.emit("log", "输出音频可视化已销毁");
    }

    // 销毁字幕管理器
    this.subtitleManager.close();

    await this.emit("disconnect");
    await this.emit("log", "已断开连接");
    console.log("🔴 断开连接完成");
  }

  /**
   * 通过数据通道发送数据
   */
  async send(data: object): Promise<void> {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      throw new Error("数据通道未就绪");
    }

    this.dataChannel.send(
      JSON.stringify({
        webrtc_id: this.webrtcId,
        ...data,
      })
    );
  }

  /**
   * 通过 HTTP 发送输入数据
   */
  async sendInput(inputData: object): Promise<void> {
    await this.post("/input_hook", {
      webrtc_id: this.webrtcId,
      ...inputData,
    });
  }

  /**
   * 静音麦克风（停止发送本地音频）
   */
  mute(): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      this.emit("log", "麦克风已静音");
    }
  }

  /**
   * 取消静音麦克风（恢复发送本地音频）
   */
  unmute(): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      this.emit("log", "麦克风已取消静音");
    }
  }

  /**
   * 获取麦克风静音状态
   */
  isMuted(): boolean {
    if (!this.localStream) return false;
    const audioTracks = this.localStream.getAudioTracks();
    return audioTracks.length > 0 && !audioTracks[0].enabled;
  }

  /**
   * 切换静音状态
   */
  toggleMute(): boolean {
    if (this.isMuted()) this.unmute();
    else this.mute();

    return this.isMuted();
  }

  /**
   * 获取连接状态
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * 获取 WebRTC ID
   */
  get id(): string {
    return this.webrtcId;
  }

  private generateWebRTCId(): void {
    this.webrtcId = Math.random().toString(36).substring(7);
  }

  private setupEventListeners(): void {
    if (!this.peerConnection) return;

    console.log("🔧 设置事件监听器", {
      hasInputVisualizer: !!this.inputVisualizer,
      hasOutputVisualizer: !!this.outputVisualizer,
    });

    // 处理接收到的音频轨道
    this.peerConnection.addEventListener("track", (evt) => {
      // 检查实例是否已被销毁
      if (!this.peerConnection || !this.isConnected) {
        console.log("⚠️ 实例已销毁，忽略 track 事件");
        return;
      }

      console.log("on track event:", evt);
      console.log("track kind:", evt.track.kind);
      console.log("streams:", evt.streams);
      console.log("transceiver:", evt.transceiver?.direction);

      // 只处理远程音频轨道
      if (evt.track.kind === "audio" && evt.streams.length > 0) {
        const remoteStream = evt.streams[0];

        if (this.audioOutput.srcObject !== remoteStream) {
          this.audioOutput.srcObject = remoteStream;
          this.emit("log", "接收到远程音频轨道");

          // 连接输出音频可视化器到远程音频流
          if (this.outputVisualizer) {
            console.log("OutputVisualizer: 连接远程音频流", {
              streamId: remoteStream.id,
              tracks: remoteStream.getAudioTracks().map((t) => ({
                id: t.id,
                kind: t.kind,
                enabled: t.enabled,
                readyState: t.readyState,
              })),
            });
            this.outputVisualizer.connectStream(remoteStream);
            this.outputVisualizer.start();
            this.emit("log", "输出音频可视化已启动");
          } else {
            console.error("OutputVisualizer 未创建！检查构造函数配置");
            this.emit("log", "错误: 输出音频可视化器未创建");
          }

          this.emit("track", remoteStream);
        } else {
          this.emit("log", "远程音频轨道已经连接，跳过重复处理");
        }
      } else {
        this.emit(
          "log",
          `收到非音频轨道或空流: kind=${evt.track.kind}, streams.length=${evt.streams.length}`
        );
      }
    });

    // 处理远程数据通道
    this.peerConnection.ondatachannel = (event) => {
      if (!this.peerConnection || !this.isConnected) {
        console.log("⚠️ 实例已销毁，忽略 datachannel 事件");
        return;
      }
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };

    // 处理连接状态变化
    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) {
        console.log("⚠️ 实例已销毁，忽略 connectionstatechange 事件");
        return;
      }

      const state = this.peerConnection.connectionState;
      if (state) {
        this.emit("connectionStateChange", state);
        this.emit("log", `连接状态: ${state}`);

        if (
          state === "failed" ||
          state === "disconnected" ||
          state === "closed"
        ) {
          this.isConnected = false;
          this.emit("disconnect");
        }
      }
    };

    // 处理 ICE 连接状态变化
    this.peerConnection.oniceconnectionstatechange = () => {
      if (!this.peerConnection) {
        console.log("⚠️ 实例已销毁，忽略 iceconnectionstatechange 事件");
        return;
      }

      const state = this.peerConnection.iceConnectionState;
      if (state) {
        this.emit("iceConnectionStateChange", state);
        this.emit("log", `ICE 连接状态: ${state}`);
      }
    };
  }

  private setupDataChannel(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      this.emit("dataChannelOpen");
      this.emit("log", "数据通道已打开");
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as Message;
        this.emit("message", message);
      } catch (error) {
        this.emit("error", `解析消息失败: ${error}`);
      }
    };

    this.dataChannel.onerror = (error) => {
      this.emit("error", `数据通道错误: ${error}`);
    };

    this.dataChannel.onclose = () => {
      this.emit("dataChannelClose");
      this.emit("log", "数据通道已关闭");
    };
  }

  private async post<T = unknown>(endpoint: string, data: object): Promise<T> {
    const url = new URL(endpoint, this.config.serverUrl).toString();
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 发送 offer 请求，带重试机制
   * 如果服务器返回 {"status":"failed",...}，会进行重试
   */
  private async sendOfferWithRetry(
    offer: RTCSessionDescriptionInit,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<RTCSessionDescriptionInit> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.emit(
          "log",
          `发送 offer 请求 (尝试 ${attempt}/${maxRetries})`
        );

        const response = await this.post<
          RTCSessionDescriptionInit & { status?: string }
        >("/webrtc/offer", {
          sdp: offer.sdp,
          type: offer.type,
          webrtc_id: this.webrtcId,
        });

        // 检查响应状态
        if (response.status === "failed") {
          const errorMsg = `Offer 请求失败: ${JSON.stringify(response)}`;
          lastError = new Error(errorMsg);
          await this.emit("log", `${errorMsg}, 准备重试...`);

          // 如果不是最后一次尝试，等待后重试
          if (attempt < maxRetries) {
            await this.delay(retryDelay);
            continue;
          }
        } else {
          // 成功返回
          await this.emit(
            "log",
            `Offer 请求成功 (尝试 ${attempt}/${maxRetries})`
          );
          return response;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        await this.emit("log", `Offer 请求异常: ${lastError.message}`);

        // 如果不是最后一次尝试，等待后重试
        if (attempt < maxRetries) {
          await this.delay(retryDelay);
          continue;
        }
      }
    }

    // 所有重试都失败
    const finalError = lastError || new Error("Offer 请求失败，未知错误");
    await this.emit(
      "error",
      `Offer 请求失败，已重试 ${maxRetries} 次: ${finalError.message}`
    );
    throw finalError;
  }

  /**
   * 延迟执行（用于重试间隔）
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
