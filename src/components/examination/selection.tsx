import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import "./selection.css";
import { shuffle } from "lodash";
import { useParams } from "react-router";
import { getLoginUser } from "@/containers/auth-middleware";
import { aiChatServer } from "@/server/training-server";
import { Button } from "@/components/ui/button";
import askAiImg from './ask_ai.png';

export type Option = {
  id: string; // unique id for React keys
  value: string;
  label: React.ReactNode;
  image?: string; // image URL (optional)
  imageAlt?: string;
  disabled?: boolean;
  is_correct?: boolean;
};

type SelectionProps = {
  question: React.ReactNode;
  answerKey?: string;
  ai_feedback?: string;
  image?: string;
  score: number;
  user_score?: number;
  options?: Option[];
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
  explanation?: boolean;
};
const selectionNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];

export default function Selection({
  question,
  ai_feedback,
  image,
  options,
  mode = "single",
  value,
  score,
  user_score = 0,
  defaultValue = [],
  onChange,
  name,
  disabled = false,
  className,
  optionClassName,
  showImage = true,
  compact = false,
  explanation = false,
  answerKey,
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
    // borderRadius: 6,
    // border: "1px solid #e6e6e6",
    cursor: disabled ? "not-allowed" : "pointer",
    // background: "#fff",
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
  };

  const shuffledOptions = useMemo(() => {
    if (options) {
      return shuffle(options);
    }
    return null;
  }, [JSON.stringify(options)]);

  const textColor = explanation ? (user_score < score ? 'text-red-700': 'text-lime-400'): '';
  const params = useParams();

  // Ask AI states (UI only)
  const [showAsk, setShowAsk] = useState(false);
  const [askText, setAskText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const askAI = async () => {
    if (!askText.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiAnswer(null);
    try {
      const user = getLoginUser();
      const userId = user?.user_id || '';
      const sectionId = params.sectionId || undefined;
      if(sectionId == null){
        return;
      }

      // compose message: include the question, the options text, and reference answer (if any)
      const optionsText = (shuffledOptions ?? []).map((o, i) => `${selectionNames[i] || i + 1}. ${String(o.label)}`).join('\n');
      const rightAnswer = shuffledOptions?.map((item, index) => item.is_correct ? selectionNames[index] : null).filter(item=>item).join('，')
      const myAnswer = shuffledOptions?.map((item, index) => internal.includes(item.value) ? selectionNames[index] : null).filter(item=>item).join('，')
      const composedMessage = 
`${String(question)}
选项：
${optionsText}
标准答案：${rightAnswer}
学生答案：${myAnswer}
${answerKey ? `题目解析：${answerKey}` : ''}
学生问题：${askText}`;

      const payload = {
        userId,
        sectionId,
        message: composedMessage,
      };

      const resp = await aiChatServer.chat(payload);
      const anyResp: any = resp;
      const data = anyResp?.data?.data ?? anyResp?.data ?? anyResp;
      const aiResp = data?.ai_response ?? data?.content ?? anyResp?.ai_response ?? null;
      if (aiResp) {
        setAiAnswer(String(aiResp));
      } else {
        setAiError('未收到AI回复');
      }
    } catch (e: any) {
      setAiError(e?.message || '请求失败');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className={className} style={wrapperStyle} role={mode === "multiple" ? "list" : "radiogroup"}>
      <div className="flex w-full items-start justify-between">
        <div className="font-semibold">{question}</div>
        <Badge variant={'outline'} className={`h-8 border-gray-400 text-gray-400`}>
          {mode === 'single'? '单选题' : '多选题'}
          <Separator orientation="vertical" />
          <span className={textColor}>{ explanation && `${user_score}/`}{score}</span>
        </Badge>
      </div>
      {image?<img src={image} alt="" style={imgStyle} />:null}
      {shuffledOptions&&shuffledOptions.map((opt, index) => {
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
            }}
          >
            <div className="flex items-center gap-2">
              <input
                id={inputId}
                type={mode === "multiple" ? "checkbox" : "radio"}
                className={`examination-checkbox ${explanation && (opt.is_correct ? 'good' : (checked ? 'bad' : ''))}`}
                name={groupName}
                checked={checked}
                onChange={() => toggleOption(opt.value, opt.disabled)}
                disabled={disabled || opt.disabled}
                aria-checked={checked}
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: compact ? 13 : 14 }}>{selectionNames[index]}: {opt.label}</div>
              </div>
            </div>
            {showImage && opt.image ? (
              <img src={opt.image} alt={opt.imageAlt || String(opt.label)} style={imgStyle} />
            ) : null}
          </label>
        );
      })}
      {showAsk && (
        <div style={{ marginTop: 8, borderTop: '1px dashed #eee', paddingTop: 8,  width: '100%' }}>
          <div style={{ marginBottom: 6 }} className="font-medium">向AI提问（可就本题提问）</div>
          <textarea
            value={askText}
            onChange={(e) => setAskText(e.target.value)}
            placeholder="请输入你想问AI的问题"
            rows={3}
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', fontSize: 14 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button type="button" size="sm" onClick={askAI} disabled={aiLoading}>
              {aiLoading ? '询问中...' : '发送'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setAskText(''); setAiAnswer(null); setAiError(null); }}>
              清空
            </Button>
          </div>

          {aiError && <div style={{ color: '#e55353', marginTop: 8 }}>{aiError}</div>}
          {aiAnswer && (
            <div style={{ marginTop: 8, padding: 8, background: '#fafafa', borderRadius: 6, border: '1px solid #eee' }}>
              <div className="font-medium">AI 的回答：</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{aiAnswer}</div>
            </div>
          )}
        </div>
      )}
      {explanation && (
        <div style={{ paddingTop: 8,  width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div><span className="font-bold">正确答案为：</span>{shuffledOptions?.map((item, index) => item.is_correct ? selectionNames[index] : null).filter(item=>item).join('，')}</div>
              <div><span className="font-bold">选项解析：</span>{ai_feedback}</div>
            </div>
            <div style={{ flex: '0 0 auto', marginLeft: 'auto'  }}>
              <button type="button" onClick={() => setShowAsk(s => !s)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
                <img src={askAiImg} alt="问问AI" style={{ display: 'block', width: 120, height: 36, objectFit: 'contain' }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}