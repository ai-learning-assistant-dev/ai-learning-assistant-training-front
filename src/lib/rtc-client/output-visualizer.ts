/**
 * AI 输出音频可视化（Canvas 绘制宝珠样式）
 * 使用 Canvas 绘制动态渐变球体
 */
export class OutputVisualizer {
  private containerId: string;
  private container: HTMLElement;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private animationId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // 动画参数
  private smoothedVolume = 0;
  private volumeSmoothing = 0.3;
  private time = 0;
  private baseRadius = 0;
  private currentScale = 1;
  private isSpeaking = false; // 是否正在说话
  private animationPhase = 0; // 动画相位 (0-1)
  private baseAnimationSpeed = 1 / 7.14; // 基础速度：约7.14秒一个周期（减少30%速度）
  private activeAnimationSpeed = 1 / 1.8; // 活跃速度：1.8秒一个周期
  private currentAnimationSpeed = 1 / 7.14; // 当前动画速度

  // 颜色配置
  private colors = {
    baseBlue: "hsl(219,68%,83%)", // 底层均匀蓝色
    highlightPink1: "rgba(248, 194, 235, 0.7)", // 粉色高光 - 半透明
    highlightPink2: "rgba(255, 200, 240, 0.5)", // 粉色高光混合色 - 半透明
  };

  // 高光旋转角度
  private highlightRotation = 0;
  private highlightRotationSpeed = 0.5; // 旋转速度（度/帧）

  // 高光中心偏移（随机运动）
  private highlightOffsetX = 0; // X轴偏移
  private highlightOffsetY = 0; // Y轴偏移
  private highlightOffsetTargetX = 0; // X轴目标偏移
  private highlightOffsetTargetY = 0; // Y轴目标偏移
  private highlightOffsetStartX = 0; // X轴起始偏移
  private highlightOffsetStartY = 0; // Y轴起始偏移
  private highlightOffsetChangeTimer = 0; // 偏移变化计时器
  private highlightOffsetMoveDuration = 3.5; // 移动持续时间（秒）
  private highlightOffsetProgress = 0; // 移动进度（0-1）

  constructor(containerId: string) {
    this.containerId = containerId;
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;
    console.log(
      `OutputVisualizer: Container found - id: ${containerId}, width: ${container.clientWidth}, height: ${container.clientHeight}`
    );
    this.createCanvas();
    this.setupResizeObserver();
  }

  /**
   * 设置 ResizeObserver 监听容器大小变化
   */
  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.updateCanvasSize();
    });
    this.resizeObserver.observe(this.container);
  }

  /**
   * 根据容器大小更新 Canvas 尺寸
   */
  private updateCanvasSize(): void {
    if (!this.canvas) return;

    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    if (containerWidth > 0 && containerHeight > 0) {
      // 设置 Canvas 显示大小
      this.canvas.style.width = `${containerWidth}px`;
      this.canvas.style.height = `${containerHeight}px`;

      // 设置 Canvas 实际像素大小（使用设备像素比以获得清晰渲染）
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = containerWidth * dpr;
      this.canvas.height = containerHeight * dpr;

      // 缩放上下文以匹配设备像素比
      if (this.ctx) {
        this.ctx.scale(dpr, dpr);
      }

      // 更新基础半径（取宽高最小值的一半）
      this.baseRadius = Math.min(containerWidth, containerHeight) / 2;

      // 如果没有动画在运行，重新绘制静态状态
      if (this.animationId === null) {
        this.drawInitialState();
      }
    } else {
      console.warn(
        `OutputVisualizer: Container "${this.containerId}" has zero size (width: ${containerWidth}, height: ${containerHeight})`
      );
    }
  }

  /**
   * 创建 Canvas 元素
   */
  private createCanvas(): void {
    console.log(
      `OutputVisualizer: Creating canvas in container "${this.containerId}"`,
      "Current children:",
      this.container.children.length
    );

    // 只清理旧的 canvas 元素（如果存在），而不是清空整个容器
    const existingCanvas = this.container.querySelector("canvas");
    if (existingCanvas) {
      console.log("OutputVisualizer: Removing existing canvas");
      existingCanvas.remove();
    }

    // 创建 Canvas
    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "block";
    this.canvas.style.margin = "auto";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";

    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) {
      throw new Error("Failed to get 2D context from canvas");
    }

    this.container.appendChild(this.canvas);

    console.log(
      `OutputVisualizer: Canvas created and added to container "${this.containerId}"`,
      "Children after append:",
      this.container.children.length
    );

    // 初始化尺寸
    this.updateCanvasSize();

    // 如果 baseRadius 仍为 0，使用 setTimeout 延迟绘制
    if (this.baseRadius === 0) {
      console.log("OutputVisualizer: baseRadius is 0, will retry after layout");
      setTimeout(() => {
        this.updateCanvasSize();
        this.drawInitialState();
      }, 0);
    } else {
      // 绘制初始状态
      this.drawInitialState();
    }
  }

  /**
   * 绘制初始静态状态（未连接音频流时显示）
   */
  private drawInitialState(): void {
    if (!this.ctx || !this.canvas || this.baseRadius === 0) {
      console.log(
        `OutputVisualizer: Cannot draw initial state - ctx: ${!!this
          .ctx}, canvas: ${!!this.canvas}, baseRadius: ${this.baseRadius}`
      );
      return;
    }

    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    console.log(
      `OutputVisualizer: Drawing initial state - width: ${width}, height: ${height}, baseRadius: ${this.baseRadius}`
    );

    // 清空画布
    this.ctx.clearRect(0, 0, width, height);

    // 绘制静态宝珠
    this.drawOrb(width, height);
  }

  /**
   * 连接音频流
   */
  connectStream(stream: MediaStream): void {
    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    source.connect(this.analyser);
  }

  /**
   * 开始渲染
   */
  start(): void {
    if (this.animationId !== null) return;
    this.animate();
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
    console.log(
      `OutputVisualizer: Destroying visualizer "${this.containerId}"`
    );
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
    // 只移除我们创建的 canvas，而不是清空整个容器
    if (this.canvas && this.canvas.parentNode === this.container) {
      this.container.removeChild(this.canvas);
      this.canvas = null;
    }
    this.ctx = null;
  }

  /**
   * 动画循环
   */
  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    if (!this.ctx || !this.canvas) return;

    // 获取音频数据
    let volume = 0;
    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        sum += this.dataArray[i];
      }
      volume = sum / this.dataArray.length / 255; // 归一化到 0-1
    }

    // 平滑音量
    this.smoothedVolume +=
      (volume - this.smoothedVolume) * this.volumeSmoothing;

    // 判断是否正在说话（音量阈值）
    this.isSpeaking = this.smoothedVolume > 0.05;

    // 动态调整动画速度和幅度
    const targetSpeed = this.isSpeaking
      ? this.activeAnimationSpeed
      : this.baseAnimationSpeed;
    this.currentAnimationSpeed +=
      (targetSpeed - this.currentAnimationSpeed) * 0.1; // 平滑过渡

    // 更新动画相位 - 即使没有音频也持续运动
    this.animationPhase += this.currentAnimationSpeed / 60; // 假设60fps
    if (this.animationPhase > 1) {
      this.animationPhase -= 1; // 循环
    }

    // 根据动画相位计算缩放和背景位置（精确还原CSS关键帧）
    this.updateAnimationState();

    // 更新时间
    this.time += 0.016; // 约 60fps

    // 清空画布
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    this.ctx.clearRect(0, 0, width, height);

    // 绘制宝珠
    this.drawOrb(width, height);
  }

  /**
   * 根据动画相位更新状态
   * 底层圆球只改变半径，粉色高光随机旋转
   * 常态时背景也会缓慢呼吸，半径变化幅度约8%
   *
   * 常态下：背景呼吸速度减少30%，高光运动幅度增加10%
   * 说话时：背景呼吸速度不变，收缩幅度加大10%，高光运动幅度增加20%，高光运动速度增加20%
   */
  private updateAnimationState(): void {
    const phase = this.animationPhase;

    if (this.isSpeaking) {
      // 说话状态：较大的缩放变化，收缩幅度加大10%
      if (phase <= 0.25) {
        const t = phase / 0.25;
        this.currentScale = 1 + 0.022 * t; // 原0.02，增加10%
      } else if (phase <= 0.5) {
        const t = (phase - 0.25) / 0.25;
        this.currentScale = 1 + 0.022 + 0.055 * t; // 原0.02+0.05，增加10%
      } else if (phase <= 0.75) {
        const t = (phase - 0.5) / 0.25;
        this.currentScale = 1 + 0.077 - 0.077 * t; // 原0.07，增加10%
      } else {
        this.currentScale = 1;
      }
    } else {
      // 常态：使用呼吸效果，幅度约8%（已通过减少速度30%实现，这里保持原幅度）
      const breathingScale = 1 + Math.sin(phase * Math.PI * 2) * 0.04; // ±4% = 总共8%变化
      this.currentScale = breathingScale;
    }

    // 更新高光旋转角度（添加一些随机性）
    // 常态：高光运动幅度增加10%再整体增加20% = 1.1 × 1.2 = 1.32
    // 说话：高光运动幅度增加20%再整体增加20% = 1.2 × 1.2 = 1.44，速度增加20%
    const baseRotationVariation = 0.3;
    const rotationVariation = this.isSpeaking
      ? Math.sin(this.time * 0.7) * (baseRotationVariation * 1.44) // 1.2 × 1.2 = 1.44
      : Math.sin(this.time * 0.7) * (baseRotationVariation * 1.32); // 1.1 × 1.2 = 1.32

    const rotationSpeedMultiplier = this.isSpeaking ? 1.8 : 1; // 说话时速度增加20%（从1.5改为1.8）

    this.highlightRotation +=
      (this.highlightRotationSpeed + rotationVariation) *
      rotationSpeedMultiplier;

    // 更新高光中心偏移（随机运动，最大偏移不超过半径的15%）
    this.highlightOffsetChangeTimer += 1 / 60; // 假设60fps

    // 每2-4秒随机改变目标偏移位置
    const changeInterval = this.isSpeaking ? 2 : 3.5; // 说话时更频繁变化
    if (this.highlightOffsetChangeTimer >= changeInterval) {
      this.highlightOffsetChangeTimer = 0;
      this.highlightOffsetProgress = 0; // 重置进度
      this.highlightOffsetMoveDuration = changeInterval;

      // 保存当前位置为起始位置
      this.highlightOffsetStartX = this.highlightOffsetX;
      this.highlightOffsetStartY = this.highlightOffsetY;

      // 生成新的随机目标偏移
      const maxOffset = 0.15;

      if (this.isSpeaking) {
        // 说话时：完全随机
        this.highlightOffsetTargetX = (Math.random() * 2 - 1) * maxOffset;
        this.highlightOffsetTargetY = (Math.random() * 2 - 1) * maxOffset;
      } else {
        // 常态时：方向变化幅度不会太大（在当前方向上小幅调整）
        const currentAngle = Math.atan2(
          this.highlightOffsetY,
          this.highlightOffsetX
        );
        const angleVariation = ((Math.random() * 2 - 1) * Math.PI) / 4; // ±45度变化
        const newAngle = currentAngle + angleVariation;
        const distance = Math.random() * maxOffset * 0.8 + maxOffset * 0.2; // 0.2-1.0倍maxOffset

        this.highlightOffsetTargetX = Math.cos(newAngle) * distance;
        this.highlightOffsetTargetY = Math.sin(newAngle) * distance;
      }
    }

    // 更新移动进度
    this.highlightOffsetProgress = Math.min(
      1,
      this.highlightOffsetChangeTimer / this.highlightOffsetMoveDuration
    );

    // 应用缓动函数
    let easedProgress = this.highlightOffsetProgress;
    if (this.isSpeaking) {
      // 说话时：快入缓出（ease-out cubic）
      easedProgress = 1 - Math.pow(1 - this.highlightOffsetProgress, 3);
    }
    // 常态时：匀速（使用原始progress，即线性）

    // 根据缓动进度插值计算当前位置
    this.highlightOffsetX =
      this.highlightOffsetStartX +
      (this.highlightOffsetTargetX - this.highlightOffsetStartX) *
        easedProgress;
    this.highlightOffsetY =
      this.highlightOffsetStartY +
      (this.highlightOffsetTargetY - this.highlightOffsetStartY) *
        easedProgress;
  }

  /**
   * 绘制宝珠（两层结构）
   * 底层：均匀蓝色圆球，运动时只改变半径
   * 顶层：粉色高光，从中心向外渐变，半径约为底层的一半，会旋转
   */
  private drawOrb(width: number, height: number): void {
    if (!this.ctx) return;

    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = this.baseRadius * this.currentScale * 0.8; // 底层圆球半径
    const highlightRadius = baseRadius * 0.85; // 高光半径85%

    // === 第一层：底层均匀蓝色圆球 ===
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = this.colors.baseBlue;
    this.ctx.fill();

    // === 第二层：粉色高光（带旋转和渐变）===
    this.ctx.save(); // 保存当前状态

    // 计算高光中心偏移位置（相对于baseRadius的百分比）
    const offsetX = this.highlightOffsetX * baseRadius;
    const offsetY = this.highlightOffsetY * baseRadius;

    // 移动到带偏移的圆心进行旋转
    this.ctx.translate(centerX + offsetX, centerY + offsetY);
    this.ctx.rotate((this.highlightRotation * Math.PI) / 180);

    // 创建径向渐变 - 从中心粉色到透明，分为两段
    const highlightGradient = this.ctx.createRadialGradient(
      0,
      0,
      0,
      0,
      0,
      highlightRadius
    );

    // 第一段（0~15%）：中心最亮（亮度增加20%，不透明度略微减小）
    highlightGradient.addColorStop(0, "rgba(249, 206, 239, 1)"); // 中心：更亮，不透明度从0.97降至0.92
    highlightGradient.addColorStop(0.15, "rgba(249, 206, 239, 0.95)"); // 15%处：更亮，不透明度从0.85降至0.80
    // 第二段（15%~85%）：稍亮，逐渐透明
    highlightGradient.addColorStop(0.5, "rgba(255, 211, 243, 0.48)"); // 中段：更亮，不透明度略减
    highlightGradient.addColorStop(0.85, "rgba(249, 206, 239, 0.13)"); // 85%处：更亮，不透明度略减
    highlightGradient.addColorStop(1, "rgba(249, 206, 239, 0)"); // 边缘：完全透明

    // 绘制高光圆
    this.ctx.beginPath();
    this.ctx.arc(0, 0, highlightRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = highlightGradient;
    this.ctx.fill();

    this.ctx.restore(); // 恢复状态
  }
}
