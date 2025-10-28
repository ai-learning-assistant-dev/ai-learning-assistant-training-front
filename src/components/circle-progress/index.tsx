import { uniqueId } from "lodash";
import { useEffect, useState } from "react";
import "./index.css";

export function CircleProgress(
  { progress = 20,
    size = 52,
    strokeWidth = 6, 
    animate = true, 
    animationDuration = 1000,
    progressColor = '#4039FA', 
    circleColor = '#E5E5E5',
    textColor = 'black',
    showPercentage = false,
    gradient = false,
    gradientColors = ['red', 'yellow'],
    children
  }:
    {
      progress?: number,
      size?: number,
      animate?: boolean,
      animationDuration?: number,
      strokeWidth?: number, 
      progressColor?: string, 
      circleColor?: string,
      textColor?: string,
      showPercentage?: boolean,
      gradient?: boolean,
      gradientColors?: [string, string],
      children?: React.ReactNode
    }
) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  useEffect(() => {
    if (animate) {
      let start = 0;
      const increment = progress / (animationDuration / 16);

      const timer = setInterval(() => {
        start += increment;
        if (start >= progress) {
          start = progress;
          clearInterval(timer);
        }
        setAnimatedProgress(Math.floor(start));
      }, 16);

      return () => clearInterval(timer);
    } else {
      setAnimatedProgress(progress);
    }
  }, [progress, animate, animationDuration]);

  const [gradientId] = useState(uniqueId(""));

  return (
    <div className="circular-progress-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="circular-progress-svg">
        {/* 背景圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={circleColor}
          fill="none"
          className="background-circle"
        />

        {/* 进度圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={gradient ? `url(#${gradientId})` : progressColor}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="progress-circle"
          style={{
            transition: animate ? `stroke-dashoffset ${animationDuration}ms ease-in-out` : 'none'
          }}
        />

        {/* 渐变定义 */}
        {gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientColors[0]} />
              <stop offset="100%" stopColor={gradientColors[1]} />
            </linearGradient>
          </defs>
        )}
      </svg>

      {/* 中心内容 */}
      <div className="circular-progress-content" style={{ color: textColor }}>
        {showPercentage ? (
          <div className="percentage-text">
            <span className="percentage-number">{animatedProgress}</span>
            <span className="percentage-symbol">%</span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};