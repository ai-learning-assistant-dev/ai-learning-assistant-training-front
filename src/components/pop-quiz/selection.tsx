import React, { useEffect, useMemo, useState } from "react";

export type Option = {
  id: string; // unique id for React keys
  value: string;
  label: React.ReactNode;
  image?: string; // image URL (optional)
  imageAlt?: string;
  disabled?: boolean;
};

type SelectionProps = {
  question: React.ReactNode;
  image?: string;
  options: Option[];
  mode?: "single" | "multiple"; // single = 单选, multiple = 多选
  value?: string[]; // 受控值（总是数组），单选时数组长度 <= 1
  defaultValue?: string[]; // 非受控初始值
  onChange?: (selected: string[]) => void;
  name?: string; // radio group name (单选时)
  disabled?: boolean;
  className?: string;
  optionClassName?: string;
  showImage?: boolean; // 是否显示图片（若 option.image 存在则显示）
  compact?: boolean; // 简洁模式（小尺寸）
};

export default function Selection({
  question,
  image,
  options,
  mode = "single",
  value,
  defaultValue = [],
  onChange,
  name,
  disabled = false,
  className,
  optionClassName,
  showImage = true,
  compact = false,
}: SelectionProps) {
  const isControlled = value !== undefined;
  const generatedName = useMemo(() => `select-${Math.random().toString(36).slice(2, 8)}`, []);
  const groupName = name || generatedName;

  const [internal, setInternal] = useState<string[]>(
    isControlled ? (value as string[]) : defaultValue ?? []
  );

  useEffect(() => {
    if (isControlled) {
      setInternal(value as string[]);
    }
  }, [value, isControlled]);

  function update(next: string[]) {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }

  function toggleOption(optValue: string, optDisabled?: boolean) {
    debugger;
    if (disabled || optDisabled) return;
    if (mode === "multiple") {
      const exists = internal.includes(optValue);
      const next = exists ? internal.filter((v) => v !== optValue) : [...internal, optValue];
      update(next);
    } else {
      const next = internal.includes(optValue) ? [] : [optValue];
      update(next);
    }
  }

  // minimal styles
  const wrapperStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: compact ? 8 : 12,
    fontFamily: "inherit",
    alignItems: "start",
  };

  const optionStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "start",
    flexDirection: 'column',
    gap: 10,
    padding: compact ? "6px 8px" : "10px 12px",
    borderRadius: 6,
    border: "1px solid #e6e6e6",
    cursor: disabled ? "not-allowed" : "pointer",
    background: "#fff",
  };

  const optionDisabledStyle: React.CSSProperties = {
    opacity: 0.6,
    cursor: "not-allowed",
  };

  const imgStyle: React.CSSProperties = {
    width: compact ? 48 : 352,
    height: compact ? 48 : 352,
    objectFit: "cover",
    borderRadius: 6,
    border: "1px solid #f0f0f0",
  };

  return (
    <div className={className} style={wrapperStyle} role={mode === "multiple" ? "list" : "radiogroup"}>
      <div>{question}{image?<img src={image} alt="" style={imgStyle} />:null}</div>
      {options.map((opt) => {
        const checked = internal.includes(opt.value);
        const inputId = `${groupName}-${opt.id}`;
        return (
          <label
            key={opt.id}
            htmlFor={inputId}
            className={optionClassName}
            style={{
              ...optionStyle,
              ...(opt.disabled ? optionDisabledStyle : {}),
              ...(checked ? { borderColor: "#4b9cff", background: "#f2f9ff" } : {}),
            }}
          >
            <div className="flex items-center gap-2">
              <input
                id={inputId}
                type={mode === "multiple" ? "checkbox" : "radio"}
                name={groupName}
                checked={checked}
                onChange={() => toggleOption(opt.value, opt.disabled)}
                disabled={disabled || opt.disabled}
                style={{ width: 16, height: 16 }}
                aria-checked={checked}
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: compact ? 13 : 14 }}>{opt.label}</div>
              </div>
            </div>
            {showImage && opt.image ? (
              <img src={opt.image} alt={opt.imageAlt || String(opt.label)} style={imgStyle} />
            ) : null}
          </label>
        );
      })}
    </div>
  );
}