'use client';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ui/shadcn-io/ai/conversation';
import { Loader } from '@/components/ui/shadcn-io/ai/loader';
import { Message, MessageAvatar, MessageContent } from '@/components/ui/shadcn-io/ai/message';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ui/shadcn-io/ai/reasoning';
import { Source, Sources, SourcesContent, SourcesTrigger } from '@/components/ui/shadcn-io/ai/source';
import { cn } from '@/lib/utils';
import { MicIcon, ArrowUpIcon, PhoneIcon, MicOffIcon, XIcon, FileTextIcon, SunDimIcon, ArrowRightIcon, Fingerprint, Quote } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { nanoid } from 'nanoid';
import { type FormEventHandler, useCallback, useEffect, useRef, useState } from 'react';
import { aiChatServer, leadingQuestionServer, type AiPersona, type LeadingQuestionResponse } from '@/server/training-server';
import { useAutoCache } from '@/containers/auto-cache';
import { useParams } from 'react-router';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { getLoginUser } from '@/containers/auth-middleware';
import { match, P } from 'ts-pattern';
import { VoiceUI } from './voice';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Response } from '@/components/ui/shadcn-io/ai/response';
import { Streamdown } from 'streamdown';

export const SEND_TO_AI = 'ai-insert-text';

export function sendToAI(message: string) {
  const event = new CustomEvent(SEND_TO_AI, {
    detail: { text: message },
  });
  window.dispatchEvent(event);
}

export const AI_LEARNING_REVIEW = 'ai-learning-review';

export function aiLearningReview(sectionId: string) {
  window.dispatchEvent(
    new CustomEvent(AI_LEARNING_REVIEW, {
      detail: {
        sectionId,
      },
    })
  );
}

export const ADD_CITATION = 'ai-add-citation';

export function addCitation(text: string, sourcePosition?: string) {
  window.dispatchEvent(
    new CustomEvent(ADD_CITATION, {
      detail: {
        text,
        sourcePosition,
      },
    })
  );
}

type ChatMessage = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  reasoning?: string;
  sources?: Array<{ title: string; url: string }>;
  isStreaming?: boolean;
};

type LeadingQuestionSuggestion = {
  id: string;
  text: string;
};

type Citation = {
  id: string;
  text: string;
  sourcePosition?: string;
};

interface ModelOption {
  id: string;
  name: string;
  displayName: string;
}
// const characters = [
//   { id: "character1", name: "暴躁老师傅" },
//   { id: "character2", name: "温柔助手" },
//   { id: "character3", name: "严谨教授" },
// ];

// 用户和章节ID配置
function getUserId() {
  const user = getLoginUser();
  return user ? user.user_id : '04cdc3f7-8c08-4231-9719-67e7f523e845';
}

// WebRTC 服务器地址配置
const getWebRTCServerUrl = () => {
  // 根据实际部署情况配置
  return window.location.protocol + '//' + window.location.hostname + ':8989';
  // return "http://localhost:8989";
};

const EXTRA_QUESTIONS_KEY = 'ai-extra-questions-enabled';

const AiConversation = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isVoiceModeAble, setIsVoiceModeAble] = useState(true);
  const [voiceState, setVoiceState] = useState<'listening' | 'buffering' | 'speaking'>('listening');
  const [currentMessage, setCurrentMessage] = useState('');
  const [previousMessage, setPreviousMessage] = useState('欢迎使用语音对话功能');
  const [selectedPersona, setSelectedPersona] = useState<AiPersona | null>(null);
  const [leadingQuestions, setLeadingQuestions] = useState<LeadingQuestionSuggestion[]>([]);
  const [extraQuestionsEnabled, setExtraQuestionsEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(EXTRA_QUESTIONS_KEY);
      if (stored === null) return true;
      return stored === 'true';
    } catch (error) {
      console.warn('读取额外问题开关失败:', error);
      return true;
    }
  });
  const [extraQuestions, setExtraQuestions] = useState<string[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const streamingTimerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const params = useParams();
  const sectionId = params.sectionId;

  // 当voiceState变为listening时，将current移到previous
  useEffect(() => {
    if (voiceState === 'listening' && currentMessage) {
      setPreviousMessage(currentMessage);
      setCurrentMessage('');
    }
  }, [voiceState, currentMessage]);

  useEffect(() => {
    try {
      localStorage.setItem(EXTRA_QUESTIONS_KEY, extraQuestionsEnabled ? 'true' : 'false');
    } catch (error) {
      console.warn('保存额外问题开关失败:', error);
    }
  }, [extraQuestionsEnabled]);

  const { data: personasResponse } = useAutoCache(aiChatServer.getPersonas, []);
  const personas = personasResponse?.data || [];

  const fetchLeadingQuestions = useCallback(async (targetSectionId: string) => {
    if (!targetSectionId) {
      setLeadingQuestions([]);
      return;
    }

    try {
      const response = await leadingQuestionServer.searchBySection({
        section_id: targetSectionId,
        page: 1,
        limit: 3,
      });

      const items: LeadingQuestionResponse[] = response.data?.data ?? [];
      const suggestions = items
        .map((item, index) => {
          const text = item.question?.trim();
          if (!text) {
            return null;
          }

          const id = item.question_id || `leading-question-${targetSectionId}-${index}`;

          return {
            id,
            text,
          } satisfies LeadingQuestionSuggestion;
        })
        .filter((item): item is LeadingQuestionSuggestion => Boolean(item))
        .slice(0, 3);

      setLeadingQuestions(suggestions);
    } catch (error) {
      console.error('获取预设问题失败:', error);
      setLeadingQuestions([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadModels = async () => {
      try {
        setIsLoadingModels(true);
        const response = await aiChatServer.getAllModels();
        const payload = response.data?.data ?? {};

        const models: ModelOption[] = payload?.all || [];

        if (cancelled || models.length === 0) {
          return;
        }

        setModelOptions(models);
        console.log(models);

        const defaultModelName = payload?.default;
        setSelectedModel(prev => {
          // Check if previously selected model exists in new list
          if (prev && models.some(model => model.id === prev)) {
            return prev;
          }
          // Try to select default model
          const defaultModel = models.find(model => model.displayName === defaultModelName || model.name === defaultModelName);
          if (defaultModel) {
            return defaultModel.id;
          }
          // Fallback to first model
          return models[0].id;
        });
      } catch (error) {
        console.error('加载模型列表失败:', error);
      } finally {
        if (!cancelled) {
          setIsLoadingModels(false);
        }
      }
    };

    void loadModels();

    return () => {
      cancelled = true;
    };
  }, []);

  // 切换人设
  const handlePersonaSwitch = useCallback(
    async (personaId: string) => {
      const persona = personas.filter(persona => persona.persona_id === personaId)[0];
      if (!currentSessionId) {
        // 如果没有会话，直接切换选中的人设
        setSelectedPersona(persona);
        return;
      }

      try {
        const response = await aiChatServer.switchPersona({
          sessionId: currentSessionId,
          personaId: persona.persona_id,
        });

        if (response.data.success) {
          setSelectedPersona(persona);

          // 添加系统消息提示用户人设已切换
          const systemMessage: ChatMessage = {
            id: nanoid(),
            content: `已切换到人设：${persona.name}`,
            role: 'assistant',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, systemMessage]);
        }
      } catch (error) {
        console.error('切换人设失败:', error);
        alert('切换人设失败，请重试');
      }
    },
    [currentSessionId]
  );

  const handleExtraQuestionsToggle = useCallback((checked: boolean | 'indeterminate') => {
    const enabled = checked === true;
    setExtraQuestionsEnabled(enabled);
    if (!enabled) {
      setExtraQuestions([]);
    }
  }, []);

  // 加载历史记录
  const loadChatHistory = useCallback(async () => {
    setExtraQuestions([]);
    try {
      // 如果sectionId为空，不读取历史记录，直接显示欢迎消息
      if (!sectionId) {
        console.log('sectionId为空，跳过加载历史记录（日常对话模式）');
        setMessages([
          {
            id: nanoid(),
            content: '你好，我是你的AI学习助手，目前处于闲聊模式。',
            role: 'assistant',
            timestamp: new Date(),
          },
        ]);
        setLeadingQuestions([]);
        setIsLoadingHistory(false);
        return;
      }

      setIsLoadingHistory(true);

      // 1. 获取用户在该章节的所有会话
      const sessionsResponse = await aiChatServer.getSessionsByUserAndSection(getUserId(), sectionId);
      console.log('用户章节会话列表:', sessionsResponse.data);

      let sessionId: string;
      let historyMessages: ChatMessage[] = [];

      // 2. 如果有现有会话，使用最新的
      if (sessionsResponse.data.data.sessions && sessionsResponse.data.data.sessions.length > 0) {
        sessionId = sessionsResponse.data.data.sessions[0].session_id;
        console.log('使用最新的会话ID:', sessionId);
        setCurrentSessionId(sessionId);
        // 保存到 localStorage
        if (sectionId) {
          localStorage.setItem(`ai-session-${sectionId}`, sessionId);
        }

        // 3. 获取并加载历史记录
        const historyResponse = await aiChatServer.getSessionHistory(sessionId, true);
        console.log('会话历史记录:', historyResponse.data);

        // 将历史记录转换为ChatMessage格式
        historyMessages = historyResponse.data.data.history.flatMap(msg => {
          const userMsg: ChatMessage = {
            id: nanoid(),
            content: msg.user_message,
            role: 'user',
            timestamp: new Date(msg.query_time),
          };

          const aiMsg: ChatMessage = {
            id: nanoid(),
            content: msg.ai_response,
            role: 'assistant',
            timestamp: new Date(msg.query_time),
          };

          return [userMsg, aiMsg];
        });

        console.log(`加载了 ${historyMessages.length / 2} 条历史对话`);
        setLeadingQuestions([]);
      } else {
        console.log('没有找到现有会话，将在发送第一条消息时创建');
        // 显示欢迎消息
        historyMessages = [
          {
            id: nanoid(),
            content: '你好，我是你的AI课程助手，目前处于课程模式。',
            role: 'assistant',
            timestamp: new Date(),
          },
        ];

        await fetchLeadingQuestions(sectionId);
      }

      setMessages(historyMessages);
    } catch (error) {
      console.error('加载历史记录失败:', error);
      // 显示错误提示或默认消息
      setMessages([
        {
          id: nanoid(),
          content: '你好，我是你的AI课程助手，有什么可以帮助你的？',
          role: 'assistant',
          timestamp: new Date(),
        },
      ]);
      setLeadingQuestions([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [fetchLeadingQuestions, sectionId]);

  // 当 sectionId 变更时，加载对应的历史记录
  useEffect(() => {
    // 清空当前会话ID，以便为新的section重新创建或加载会话
    setCurrentSessionId(null);
    loadChatHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  // Listen for external insert requests (e.g., from SectionDetail) to prefill the input
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent)?.detail;
        const text = detail?.text;
        if (typeof text === 'string') {
          setInputValue(text);
          // Try to focus the textarea inside this component
          const textarea = containerRef.current?.querySelector('textarea[name="message"]') as HTMLTextAreaElement | null;
          if (textarea) {
            textarea.focus();
            // move cursor to end
            const len = textarea.value.length;
            textarea.setSelectionRange(len, len);
          }
        }
      } catch (err) {
        console.warn(`${SEND_TO_AI} handler error`, err);
      }
    };

    window.addEventListener(SEND_TO_AI, handler);
    return () => window.removeEventListener(SEND_TO_AI, handler);
  }, []);

  // Listen for add citation requests
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent)?.detail;
        const text = detail?.text;
        const sourcePosition = detail?.sourcePosition;
        if (typeof text === 'string' && text.trim()) {
          setCitations(prev => {
            // 检查是否已存在相同内容的引用
            if (prev.some(c => c.text === text)) {
              return prev;
            }
            return [...prev, { id: nanoid(), text, sourcePosition }];
          });
        }
      } catch (err) {
        console.warn(`${ADD_CITATION} handler error`, err);
      }
    };

    window.addEventListener(ADD_CITATION, handler);
    return () => window.removeEventListener(ADD_CITATION, handler);
  }, []);

  // Listen for chat history refresh requests
  useEffect(() => {
    const handler = () => {
      loadChatHistory();
    };

    window.addEventListener('ai-refresh-history', handler as EventListener);
    return () => window.removeEventListener('ai-refresh-history', handler as EventListener);
  }, [loadChatHistory]);

  const processStreamResponse = useCallback(
    async (messageId: string, stream: AsyncIterable<string>) => {
      try {
        for await (const textChunk of stream) {
          if (!textChunk) continue;

          setMessages(prev =>
            prev.map(msg => {
              if (msg.id !== messageId) return msg;

              return {
                ...msg,
                content: msg.content + textChunk,
                isStreaming: true,
              };
            })
          );
        }

        // Mark streaming as complete
        setMessages(prev =>
          prev.map(msg => {
            if (msg.id === messageId) {
              return {
                ...msg,
                isStreaming: false,
              };
            }
            return msg;
          })
        );
      } catch (error) {
        console.error('Stream processing error:', error);
      } finally {
        setIsTyping(false);
        setStreamingMessageId(null);
      }
    },
    [sectionId, selectedModel]
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent)?.detail as { sectionId?: string } | undefined;

      if (!detail) {
        return;
      }

      const resolvedSectionId = detail.sectionId ?? sectionId ?? '';

      if (!resolvedSectionId) {
        console.warn('[learning-review] skipped: missing section id');
        return;
      }

      let resolvedSessionId = currentSessionId;
      if (!resolvedSessionId) {
        resolvedSessionId = localStorage.getItem(`ai-session-${resolvedSectionId}`) ?? null;
      }

      if (!resolvedSessionId) {
        console.log('[learning-review] skipped: no existing session for section', resolvedSectionId);
        return;
      }

      const resolvedUserId = getUserId();

      if (!resolvedUserId) {
        console.warn('[learning-review] skipped: missing user id');
        return;
      }

      const reviewKey = `ai-learning-review-${resolvedSectionId}-${resolvedSessionId}`;
      if (localStorage.getItem(reviewKey)) {
        console.log('[learning-review] skipped: already triggered for session', resolvedSessionId);
        return;
      }

      localStorage.setItem(reviewKey, 'true');

      if (resolvedSessionId !== currentSessionId) {
        setCurrentSessionId(resolvedSessionId);
      }

      const summaryPrompt = '请针对课程学习情况进行总结';
      const userMessage: ChatMessage = {
        id: nanoid(),
        content: summaryPrompt,
        role: 'user',
        timestamp: new Date(),
      };

      const assistantMessageId = nanoid();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
      setIsTyping(true);
      setStreamingMessageId(assistantMessageId);

      aiChatServer
        .learningReview({
          userId: resolvedUserId,
          sectionId: resolvedSectionId,
          sessionId: resolvedSessionId,
          modelName: selectedModel || undefined,
        })
        .then(res => processStreamResponse(assistantMessageId, res));
    };

    window.addEventListener(AI_LEARNING_REVIEW, handler as EventListener);

    return () => {
      window.removeEventListener(AI_LEARNING_REVIEW, handler as EventListener);
    };
  }, [currentSessionId, sectionId, selectedModel, processStreamResponse]);

  const simulateTyping = useCallback((messageId: string, content: string, reasoning?: string, sources?: Array<{ title: string; url: string }>) => {
    let currentIndex = 0;
    const typeInterval = setInterval(() => {
      setMessages(prev =>
        prev.map(msg => {
          if (msg.id === messageId) {
            const currentContent = content.slice(0, currentIndex);
            return {
              ...msg,
              content: currentContent,
              isStreaming: currentIndex < content.length,
              reasoning: currentIndex >= content.length ? reasoning : undefined,
              sources: currentIndex >= content.length ? sources : undefined,
            };
          }
          return msg;
        })
      );
      currentIndex += Math.random() > 0.1 ? 1 : 0; // Simulate variable typing speed

      if (currentIndex >= content.length) {
        clearInterval(typeInterval);
        setIsTyping(false);
        setStreamingMessageId(null);
      }
    }, 50);
    return () => clearInterval(typeInterval);
  }, []);
  const sendMessage = useCallback(
    (messageText: string, currentCitations: Citation[] = []) => {
      if (isTyping) return;

      const trimmed = messageText.trim();
      if (!trimmed && currentCitations.length === 0) return;

      // 构建包含引用的完整消息
      let fullMessage = trimmed;
      if (currentCitations.length > 0) {
        const citationText = currentCitations.map(c => `"${c.text}"`).join('\n\n');
        if (trimmed) {
          fullMessage = `关于以下引用内容：\n\n${citationText}\n\n${trimmed}`;
        } else {
          fullMessage = `请帮我理解以下内容：\n\n${citationText}`;
        }
      }

      const userMessage: ChatMessage = {
        id: nanoid(),
        content: fullMessage,
        role: 'user',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      setIsTyping(true);
      setLeadingQuestions([]);
      setExtraQuestions([]);
      setCitations([]); // 发送后清空引用

      if (streamingTimerRef.current) {
        window.clearTimeout(streamingTimerRef.current);
      }

      streamingTimerRef.current = window.setTimeout(async () => {
        try {
          let sessionId = currentSessionId;
          if (!sessionId) {
            console.log('创建新会话...');
            const response = await aiChatServer.new({
              userId: getUserId(),
              sectionId: sectionId ?? '',
            });
            sessionId = response.data.data.session_id;
            setCurrentSessionId(sessionId);
            if (sectionId) {
              localStorage.setItem(`ai-session-${sectionId}`, sessionId);
            }
            console.log('新会话创建成功:', sessionId);
          }

          const assistantMessageId = nanoid();
          const assistantMessage: ChatMessage = {
            id: assistantMessageId,
            content: '',
            role: 'assistant',
            timestamp: new Date(),
            isStreaming: true,
          };
          setMessages(prev => [...prev, assistantMessage]);
          setStreamingMessageId(assistantMessageId);

          // 同时触发流式响应和额外问题生成（预加载）
          const streamPromise = aiChatServer.textChatStream({
            userId: getUserId(),
            message: trimmed,
            sessionId,
            sectionId: sectionId ?? '',
            personaId: selectedPersona?.persona_id,
            modelName: selectedModel || undefined,
            daily: !sectionId,
          });

          const extraQuestionsPromise = extraQuestionsEnabled && sessionId
            ? aiChatServer.generateExtraQuestions({
                userId: getUserId(),
                message: trimmed,
                sessionId,
                sectionId: sectionId ?? '',
                personaId: selectedPersona?.persona_id,
                modelName: selectedModel || undefined,
              })
            : null;

          // 等待流式响应完成
          await processStreamResponse(assistantMessageId, await streamPromise);

          // 流式完成后，获取预加载的额外问题
          if (extraQuestionsPromise) {
            try {
              const extraResponse = await extraQuestionsPromise;
              const questions = extraResponse.data?.data?.questions ?? [];
              if (Array.isArray(questions) && questions.length === 3) {
                setExtraQuestions(questions);
              } else {
                setExtraQuestions([]);
              }
            } catch (error) {
              console.error('生成额外问题失败:', error);
              setExtraQuestions([]);
            }
          }
        } catch (error) {
          console.error('AI Chat Error:', error);
          let message = '对话失败，请检查AI设置和网络情况';
          // @ts-ignore
          if (error?.response?.data?.details) {
            // @ts-ignore
            message = error.response.data.details
          }
          setIsTyping(false);
          setStreamingMessageId(null);

          const errorMessage: ChatMessage = {
            id: nanoid(),
            content: message,
            role: 'assistant',
            timestamp: new Date(),
            isStreaming: false,
          };
          setMessages(prev => [...prev, errorMessage]);
        } finally {
          streamingTimerRef.current = null;
        }
      }, 300);
    },
    [isTyping, currentSessionId, sectionId, selectedPersona, selectedModel, processStreamResponse, extraQuestionsEnabled]
  );

  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    event => {
      event.preventDefault();

      if ((!inputValue.trim() && citations.length === 0) || isTyping) return;

      const currentInput = inputValue;
      const currentCitations = [...citations];
      setInputValue('');
      sendMessage(currentInput, currentCitations);
    },
    [inputValue, isTyping, sendMessage, citations]
  );

  const handleLeadingQuestionClick = useCallback(
    (question: string) => {
      sendMessage(question);
    },
    [sendMessage]
  );

  const handleExtraQuestionClick = useCallback(
    (question: string) => {
      setInputValue(question);
    },
    []
  );

  const handleRemoveCitation = useCallback((citationId: string) => {
    setCitations(prev => prev.filter(c => c.id !== citationId));
  }, []);

  const handleReset = useCallback(() => {
    loadChatHistory();
    setInputValue('');
    setIsTyping(false);
    setStreamingMessageId(null);
    setExtraQuestions([]);
    setCitations([]);
  }, [loadChatHistory]);

  // 新建会话
  const handleNewSession = useCallback(async () => {
    try {
      console.log('创建新会话...');

      // 调用后端创建新会话
      const response = await aiChatServer.new({
        userId: getUserId(),
        sectionId: sectionId ?? '',
      });

      console.log('新会话创建成功:', response.data);
      const newSessionId = response.data.data.session_id;

      // 清空当前消息并设置新的会话ID
      setCurrentSessionId(newSessionId);
      // 保存到 localStorage
      if (sectionId) {
        localStorage.setItem(`ai-session-${sectionId}`, newSessionId);
      }
      setMessages([
        {
          id: nanoid(),
          content: "Hello! I'm your AI assistant. How can I help you today?",
          role: 'assistant',
          timestamp: new Date(),
        },
      ]);
      setInputValue('');
      setIsTyping(false);
      setStreamingMessageId(null);
      setExtraQuestions([]);
      setCitations([]);

      if (sectionId) {
        await fetchLeadingQuestions(sectionId);
      } else {
        setLeadingQuestions([]);
      }

      console.log('已切换到新会话:', newSessionId);
    } catch (error) {
      console.error('创建新会话失败:', error);
    }
  }, [fetchLeadingQuestions, sectionId]);

  const onVoiceClose = useCallback(() => {
    setIsVoiceMode(false);
    setIsVoiceModeAble(false);
    console.log('结束对话，刷新记录');
    loadChatHistory();

    setTimeout(() => {
      setIsVoiceModeAble(true);
    }, 2000);
  }, [loadChatHistory]);

  return (
    <div ref={containerRef} className='flex h-full w-full flex-col overflow-hidden rounded-xl border bg-background shadow-sm'>
      {/* Header */}
      <div className='flex items-center justify-between border-b bg-muted/50 px-4 py-3'>
        <div className='flex items-center gap-2'>
          <FileTextIcon />
          <span className='font-medium text-base'>AI对话框</span>
        </div>
        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-2'>
            <Checkbox id='extra-questions-toggle' checked={extraQuestionsEnabled} onCheckedChange={handleExtraQuestionsToggle} />
            <label
              htmlFor='extra-questions-toggle'
              className='text-sm text-muted-foreground cursor-pointer select-none'
            >
              额外问题
            </label>
          </div>
          <Button variant='outline' size='sm' onClick={handleNewSession} disabled={isTyping}>
            新建对话
          </Button>
        </div>
      </div>

      {/* Voice Mode or Text Mode */}
      {isVoiceMode ? (
        <>
          <Item variant='outline' className='m-4 mb-0' size='sm'>
            <ItemMedia>
              <Fingerprint className='size-5' />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{selectedPersona ? selectedPersona.name : '默认人设'}</ItemTitle>
            </ItemContent>
            <ItemActions>AI人设</ItemActions>
          </Item>
          <VoiceUI
            userId={getUserId()}
            sessionId={currentSessionId || ''}
            sectionId={sectionId || ''}
            personaId={selectedPersona?.persona_id}
            serverUrl={getWebRTCServerUrl()}
            onClose={onVoiceClose}
          />
        </>
      ) : (
        /* Text Mode - Conversation Area */
        <>
          {/* AI Settings and Model Selection */}
          <div className='flex items-center gap-2 border-b px-4 py-3'>
            <div className='flex items-center flex-1 h-10'>
              <Select value={selectedPersona?.persona_id} onValueChange={handlePersonaSwitch}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='默认人设' />
                </SelectTrigger>
                <SelectContent>
                  {personas.map(persona => (
                    <SelectItem key={persona.persona_id} value={persona.persona_id}>
                      {persona.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='flex items-center min-w-[160px] h-10'>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className='w-full' disabled={isLoadingModels || modelOptions.length === 0}>
                  <SelectValue placeholder={isLoadingModels ? '加载模型...' : '未选择'} />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Conversation Area */}
          <Conversation className='flex-1'>
            <ConversationContent className='space-y-4'>
              {isLoadingHistory && (
                <div className='flex items-center justify-center py-4'>
                  <Loader size={16} />
                  <span className='ml-2 text-muted-foreground text-sm'>Loading chat history...</span>
                </div>
              )}
              {!isLoadingHistory && leadingQuestions.length > 0 && (
                <div className='rounded-lg border border-dashed border-muted bg-muted/40 p-4'>
                  <div className='mb-3 text-xs font-medium text-muted-foreground'>预设问题</div>
                  <div className='grid gap-2'>
                    {leadingQuestions.map(question => (
                      <Button
                        key={question.id}
                        type='button'
                        variant='outline'
                        size='sm'
                        className='justify-start whitespace-normal text-left'
                        onClick={() => handleLeadingQuestionClick(question.text)}
                      >
                        {question.text}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map(message => (
                <div key={message.id} className='space-y-3'>
                  <Message from={message.role}>
                    <MessageContent>
                      {message.isStreaming && message.content === '' ? (
                        <div className='flex items-center gap-2'>
                          <Loader size={14} />
                          <span className='text-muted-foreground text-sm'>Thinking...</span>
                        </div>
                      ) : message.role === 'assistant' ? (
                        <Streamdown>{message.content}</Streamdown>
                      ) : (
                        <p className='leading-7'>{message.content}</p>
                      )}
                    </MessageContent>
                    <MessageAvatar
                      src={message.role === 'user' ? 'https://github.com/dovazencot.png' : 'https://github.com/vercel.png'}
                      name={message.role === 'user' ? 'User' : 'AI'}
                    />
                  </Message>
                  {/* Reasoning */}
                  {message.reasoning && (
                    <div className='ml-10'>
                      <Reasoning isStreaming={message.isStreaming} defaultOpen={false}>
                        <ReasoningTrigger />
                        <ReasoningContent>{message.reasoning}</ReasoningContent>
                      </Reasoning>
                    </div>
                  )}
                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className='ml-10'>
                      <Sources>
                        <SourcesTrigger count={message.sources.length} />
                        <SourcesContent>
                          {message.sources.map((source, index) => (
                            <Source key={index} href={source.url} title={source.title} />
                          ))}
                        </SourcesContent>
                      </Sources>
                    </div>
                  )}
                </div>
              ))}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          {/* Input Area */}
          <div className='px-4 pt-1 pb-4 bg-white'>
            {/* Toolbar buttons */}
            <div className='flex items-center gap-2 mb-3'>
              <Button variant={'outline'} disabled={isTyping}>
                <MicIcon className='size-5 text-muted-foreground' />
              </Button>
              <Button variant={'outline'} disabled={isTyping}>
                <ArrowUpIcon className='size-5 text-muted-foreground' />
              </Button>
              <Button variant={'outline'} disabled={isTyping || !isVoiceModeAble} onClick={() => setIsVoiceMode(true)}>
                <PhoneIcon className='size-5 text-muted-foreground' />
              </Button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Composite input with citations and extra questions */}
              <div className='relative rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring'>
                {/* Extra Questions inside input */}
                {extraQuestionsEnabled && extraQuestions.length > 0 && (
                  <div className='p-2 pb-0 border-b border-border/50'>
                    <div className='mb-1.5 text-xs font-medium text-muted-foreground'>额外问题</div>
                    <div className='flex flex-wrap gap-1.5 pb-2'>
                      {extraQuestions.map((question, index) => (
                        <Tooltip key={`${question}-${index}`}>
                          <TooltipTrigger asChild>
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              className='h-7 px-2 text-xs justify-start text-left overflow-hidden'
                              onClick={() => handleExtraQuestionClick(question)}
                            >
                              <span className='truncate block max-w-[200px]'>{question}</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side='top' className='max-w-md'>
                            <p className='text-xs'>{question}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}
                {/* Citations inside input */}
                {citations.length > 0 && (
                  <div className={cn('p-2 pb-0', extraQuestionsEnabled && extraQuestions.length > 0 ? '' : 'border-b border-border/50')}>
                    <div className='mb-1.5 text-xs font-medium text-muted-foreground'>引用内容</div>
                    <div className='flex flex-wrap gap-2 pb-2'>
                      {citations.map((citation) => (
                        <Tooltip key={citation.id}>
                          <TooltipTrigger asChild>
                            <div className='inline-flex items-center gap-1 px-2 py-1 bg-muted/50 border border-border rounded-md text-xs cursor-default hover:bg-muted transition-colors'>
                              <Quote className='w-3 h-3 text-muted-foreground flex-shrink-0' />
                              <span className='truncate max-w-[120px]'>{citation.text}</span>
                              <button
                                type='button'
                                className='ml-1 text-muted-foreground hover:text-foreground transition-colors'
                                onClick={() => handleRemoveCitation(citation.id)}
                              >
                                <XIcon className='w-3 h-3' />
                              </button>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side='top' className='max-w-md whitespace-pre-wrap'>
                            <p className='text-xs'>{citation.text}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}
                {/* Textarea */}
                <Textarea
                  name='message'
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if ((inputValue.trim() || citations.length > 0) && !isTyping) {
                        handleSubmit(e as any);
                      }
                    }
                  }}
                  placeholder={citations.length > 0 ? '添加问题或直接发送引用...' : '输入你的问题......'}
                  disabled={isTyping}
                  className='w-full min-h-[120px] max-h-[300px] border-0 focus-visible:ring-0 resize-none'
                  rows={1}
                />

                {/* Send Button inside input */}
                <Button 
                  type='submit' 
                  variant='ghost' 
                  disabled={(!inputValue.trim() && citations.length === 0) || isTyping} 
                  className='absolute right-2 bottom-2'
                >
                  <ArrowRightIcon />
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};
export default AiConversation;
