import React, { useState, useEffect } from "react";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";

type ShortAnswerProps = {
  id?: string;
  question: string;
  answerKey?: string;
  score: number;
  user_score?: number;
  image?: string;
  initialValue?: string;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  explanation?: boolean;
  // 提交时返回答案
  onSubmit?: (answer: string) => void;
  // 每次变更时返回答案
  onChange?: (answer: string) => void;
};

const imgStyle: React.CSSProperties = {
  width: 352,
  height: 352,
  objectFit: "cover",
  borderRadius: 6,
  border: "1px solid #f0f0f0",
};

export default function ShortAnswer({
  id,
  question,
  image,
  initialValue = "",
  placeholder = "在此输入你的答案",
  maxLength,
  score,
  disabled = false,
  onSubmit,
  onChange,
}: ShortAnswerProps) {
  const [value, setValue] = useState<string>(initialValue);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onChange?.(value);
    // 简单校验：必填与长度
    if (touched && value.trim() === "") {
      setError("此题为必答题。");
      return;
    }
    if (maxLength && value.length > maxLength) {
      setError(`已超过最大长度 ${maxLength} 字符。`);
      return;
    }
    setError(null);
  }, [value, touched, maxLength, onChange]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (disabled) return;
    setValue(e.target.value);
    setTouched(true);
  }

  const textareaId = id ?? `short-answer-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div
      style={{
        // border: "1px solid #e6e6e6",
        padding: 12,
        // borderRadius: 6,
        maxWidth: 720,
      }}
    >
      <label htmlFor={textareaId} style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
        <div className="flex w-full items-start justify-between"><div>{question}</div><Badge variant={'outline'} className="h-8 border-gray-400 text-gray-400">简答题<Separator orientation="vertical" />{score}</Badge></div>
        {image?<img src={image} alt="" style={imgStyle} />:null}
      </label>

      <textarea
        id={textareaId}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!error}
        rows={12}
        style={{
          width: "100%",
          resize: "vertical",
          padding: 8,
          borderRadius: 4,
          border: error ? "1px solid #e55353" : "1px solid #ccc",
          fontSize: 14,
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <div style={{ color: error ? "#e55353" : "#666", fontSize: 12 }}>
          {error ?? (maxLength ? `${value.length}/${maxLength}` : `${value.length} 字符`)}
        </div>
      </div>
    </div>
  );
}