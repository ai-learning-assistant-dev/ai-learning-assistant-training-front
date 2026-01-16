import React, { useState, useEffect } from "react";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { useParams } from "react-router";
import { getLoginUser } from "@/containers/auth-middleware";
import { aiChatServer } from "@/server/training-server";
import { Button } from "@/components/ui/button";
import { Response } from '@/components/ui/shadcn-io/ai/response';
import { addCitation } from "../ai-conversation";
import { Sparkle } from 'lucide-react';

type ShortAnswerProps = {
  id?: string;
  question: string;
  answerKey?: string;
  ai_feedback?: string;
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
  answerKey,
  ai_feedback,
  image,
  initialValue = "",
  placeholder = "在此输入你的答案",
  maxLength,
  score,
  user_score = 0,
  explanation = false,
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

  const textColor = explanation ? (user_score < score ? 'text-red-700': 'text-lime-400'): '';

  const params = useParams();

  // Ask AI states
  const [showAsk, setShowAsk] = useState(false);
  const [askText, setAskText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  return (
    <div style={{ width: 720 }}>
      <label htmlFor={textareaId} style={{ display: "block", marginBottom: 8}} className="font-semibold">
        <div className="flex w-full items-start justify-between">
          <div><Response>{question}</Response></div>
          <Badge variant={'outline'} className="h-8 border-gray-400 text-gray-400">简答题<Separator orientation="vertical" />
          <span className={textColor}>{ explanation && `${user_score}/`}{score}</span>
          </Badge>
        </div>
        {image ? <img src={image} alt="" style={imgStyle} /> : null}
      </label>

      {!explanation && (
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
      )}

      {explanation && (
        <div style={{ position: 'relative', paddingTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div>
                <span className="font-bold">参考答案为：</span>{answerKey}
              </div>
              <div>
                <span className="font-bold">你的答案为：</span>{value}
              </div>
              <div>
                <span className="font-bold">AI批改：</span>{ai_feedback}
              </div>
            </div>
            <div style={{ flex: '0 0 auto', marginLeft: 'auto' }}>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="gap-1" 
                onClick={() => {
                  const citationText = `【简答题】${question}\n参考答案：${answerKey || '无'}\n我的答案：${value || '无'}\nAI批改：${ai_feedback || '无'}`;
                  addCitation(citationText, `exercise-short-answer`);
                }}
              >
                <Sparkle className="w-4 h-4" />
                问问AI
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAsk && (
        <div style={{ marginTop: 8, borderTop: '1px dashed #eee', paddingTop: 8 }}>
          <div style={{ marginBottom: 6 }} className="font-medium">向AI提问（可就本题提问）</div>
          <textarea
            value={askText}
            onChange={(e) => setAskText(e.target.value)}
            placeholder="请输入你想问AI的问题"
            rows={3}
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', fontSize: 14 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button type="button" size="sm" onClick={async () => {
              if (!askText.trim()) return;
              setAiLoading(true);
              setAiError(null);
              setAiAnswer(null);
              try {
                const user = getLoginUser();
                const userId = user?.user_id || '';
                const sectionId = params.sectionId || undefined;

                // compose message: include the question and reference answer (if any) to provide context
                const composedMessage = `[inner]对于这个问题学生有疑问，请给出你的解答。\n\n # 问题原文：${question}\n${answerKey ? `## 参考答案：${answerKey}\n` : ''} # 学生的疑问：${askText}\n`;

                const payload: any = {
                  userId,
                  sectionId,
                  message: composedMessage,
                };

                const resp = await aiChatServer.chat(payload as any);
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
            }} disabled={aiLoading}>
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
    </div>
  );
}