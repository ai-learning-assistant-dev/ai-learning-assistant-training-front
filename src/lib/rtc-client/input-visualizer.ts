/**
 * 用户麦克风输入音频可视化（5个柱条）
 */
export class InputVisualizer {
  private containerId: string;
  private container: HTMLElement;
  private wrapper: HTMLDivElement | null = null;
  private bars: HTMLDivElement[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private animationId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // 平滑和抖动参数
  private restingHeight = 30;
  private maxJitter = 15;
  private multiplier = 3.5;
  private smoothedAmplitude = 0;
  private audioSmoothing = 0.4;
  private jitters = [0, 0, 0, 0, 0];
  private lastJitterTime = 0;
  private jitterInterval = 150;

  // 柱条尺寸比例（相对于容器高度）
  private barWidthRatio = 0.2; // 柱条宽度 = 容器高度 * 0.2
  private barGapRatio = 0.1; // 柱条间距 = 容器高度 * 0.1
  private restingHeightRatio = 0.25; // 静止高度 = 容器高度 * 0.25

  constructor(containerId: string) {
    this.containerId = containerId;
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;
    console.log(
      `InputVisualizer: Container found - id: ${containerId}, width: ${container.clientWidth}, height: ${container.clientHeight}`
    );
    this.createBars();
    this.setupResizeObserver();
  }

  /**
   * 设置 ResizeObserver 监听容器大小变化
   */
  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.updateBarSizes();
    });
    this.resizeObserver.observe(this.container);
  }

  /**
   * 根据容器大小更新柱条尺寸
   */
  private updateBarSizes(): void {
    const containerHeight = this.container.clientHeight;
    const barWidth = containerHeight * this.barWidthRatio;
    const barGap = containerHeight * this.barGapRatio;
    this.restingHeight = containerHeight * this.restingHeightRatio;

    if (this.wrapper) {
      this.wrapper.style.gap = `${barGap}px`;
    }

    this.bars.forEach((bar) => {
      bar.style.width = `${barWidth}px`;
      bar.style.height = `${this.restingHeight}px`;
      bar.style.borderRadius = `${barWidth / 2}px`;
    });
  }

  /**
   * 创建5个柱条元素
   */
  private createBars(): void {
    console.log(
      `InputVisualizer: Creating bars in container "${this.containerId}"`,
      "Current children:",
      this.container.children.length
    );

    // 只清理旧的 wrapper 元素（如果存在），而不是清空整个容器
    const existingWrapper = this.container.querySelector("div");
    if (existingWrapper) {
      console.log("InputVisualizer: Removing existing wrapper");
      existingWrapper.remove();
    }

    // 创建内部包装容器
    this.wrapper = document.createElement("div");
    this.wrapper.style.display = "flex";
    this.wrapper.style.alignItems = "center";
    this.wrapper.style.justifyContent = "center";
    this.wrapper.style.height = "100%";
    this.wrapper.style.width = "100%";

    // 创建5个柱条
    for (let i = 0; i < 5; i++) {
      const bar = document.createElement("div");
      bar.style.backgroundColor = "#808080";
      bar.style.transition = "height 0.15s ease-out";
      this.bars.push(bar);
      this.wrapper.appendChild(bar);
    }

    this.container.appendChild(this.wrapper);

    console.log(
      `InputVisualizer: Bars created and added to container "${this.containerId}"`,
      "Children after append:",
      this.container.children.length
    );

    // 初始化尺寸
    this.updateBarSizes();
  }

  /**
   * 连接音频流
   */
  connectStream(stream: MediaStream): void {
    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 32;

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    source.connect(this.analyser);
  }

  /**
   * 开始渲染
   */
  start(): void {
    if (this.animationId !== null) return;
    this.animate(performance.now());
  }

  /**
   * 停止渲染
   */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    console.log(`InputVisualizer: Destroying visualizer "${this.containerId}"`);
    this.stop();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    // 只移除我们创建的 wrapper，而不是清空整个容器
    if (this.wrapper && this.wrapper.parentNode === this.container) {
      this.container.removeChild(this.wrapper);
      this.wrapper = null;
    }
    this.bars = [];
  }

  /**
   * 动画循环
   */
  private animate(timestamp: number): void {
    this.animationId = requestAnimationFrame((time) => this.animate(time));

    if (!this.analyser || !this.dataArray) return;

    // 获取音频数据并计算平滑后的音量
    this.analyser.getByteTimeDomainData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const amplitude = this.dataArray[i] - 128;
      sum += Math.abs(amplitude);
    }
    const rawAmplitude = sum / this.dataArray.length;

    // 平滑音量
    this.smoothedAmplitude +=
      (rawAmplitude - this.smoothedAmplitude) * this.audioSmoothing;
    const volumeBoost = this.smoothedAmplitude * this.multiplier;

    // 节流更新抖动值
    if (timestamp - this.lastJitterTime > this.jitterInterval) {
      this.jitters = this.jitters.map(() => this.randomJitter());
      this.lastJitterTime = timestamp;
    }

    // 计算每个柱条的高度
    const heights = [
      this.restingHeight + volumeBoost * 0.5 + this.jitters[0],
      this.restingHeight + volumeBoost * 0.75 + this.jitters[1],
      this.restingHeight + volumeBoost * 1.0 + this.jitters[2],
      this.restingHeight + volumeBoost * 0.75 + this.jitters[3],
      this.restingHeight + volumeBoost * 0.5 + this.jitters[4],
    ];

    // 应用高度
    heights.forEach((height, i) => {
      this.bars[i].style.height = `${this.clampHeight(height)}px`;
    });
  }

  /**
   * 生成随机抖动值
   */
  private randomJitter(): number {
    return Math.random() * this.maxJitter - this.maxJitter / 2;
  }

  /**
   * 限制高度范围
   */
  private clampHeight(h: number): number {
    const maxHeight = this.container.clientHeight;
    return Math.max(this.restingHeight, Math.min(h, maxHeight));
  }
}
