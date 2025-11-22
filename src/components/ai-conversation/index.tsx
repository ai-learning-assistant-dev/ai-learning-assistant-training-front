"use client";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ui/shadcn-io/ai/conversation";
import { Loader } from "@/components/ui/shadcn-io/ai/loader";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/shadcn-io/ai/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ui/shadcn-io/ai/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ui/shadcn-io/ai/source";
import { cn } from "@/lib/utils";
import {
  MicIcon,
  ArrowUpIcon,
  PhoneIcon,
  MicOffIcon,
  XIcon,
  FileTextIcon,
  SunDimIcon,
  ArrowRightIcon,
  Fingerprint,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { nanoid } from "nanoid";
import {
  type FormEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { aiChatServer, type AiPersona } from "@/server/training-server";
import { useAutoCache } from "@/containers/auto-cache";
import { useParams } from "react-router";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { getLoginUser } from "@/containers/auth-middleware";
import { match, P } from "ts-pattern";
import { VoiceUI } from "./voice";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Response } from "@/components/ui/shadcn-io/ai/response";

export const SEND_TO_AI = "ai-insert-text";



export function sendToAI(message: string){
  const event = new CustomEvent(SEND_TO_AI, {
    detail: { text: message }
  });
  window.dispatchEvent(event);
}

export const AI_LEARNING_REVIEW = "ai-learning-review";

export function aiLearningReview(user_id: string, sectionId: string, sessionId: string){
  window.dispatchEvent(
    new CustomEvent('ai-learning-review', {
      detail: {
        userId: user_id,
        sectionId: sectionId,
        sessionId,
      },
    }),
  );
}


type ChatMessage = {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  reasoning?: string;
  sources?: Array<{ title: string; url: string }>;
  isStreaming?: boolean;
};
// const characters = [
//   { id: "character1", name: "暴躁老师傅" },
//   { id: "character2", name: "温柔助手" },
//   { id: "character3", name: "严谨教授" },
// ];

// 用户和章节ID配置
function getUserId() {
  const user = getLoginUser();
  return user ? user.user_id : "04cdc3f7-8c08-4231-9719-67e7f523e845";
}

// WebRTC 服务器地址配置
const getWebRTCServerUrl = () => {
  // 根据实际部署情况配置
  // return window.location.protocol + "//" + window.location.host + "/api";
  return "http://localhost:8989";
};

const AiConversation = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState<'listening' | 'buffering' | 'speaking'>('listening');
  const [currentMessage, setCurrentMessage] = useState('');
  const [previousMessage, setPreviousMessage] = useState('欢迎使用语音对话功能');
  const [selectedPersona, setSelectedPersona] = useState<AiPersona | null>(null);
  const streamingTimerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const params = useParams();
  const sectionId = params.sectionId;

  // 流式文本展示函数
  const streamText = useCallback((text: string, onComplete?: () => void) => {
    // 清除之前的定时器
    if (streamingTimerRef.current) {
      clearInterval(streamingTimerRef.current);
    }

    setCurrentMessage('');
    let currentIndex = 0;

    streamingTimerRef.current = window.setInterval(() => {
      if (currentIndex < text.length) {
        setCurrentMessage(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        if (streamingTimerRef.current) {
          clearInterval(streamingTimerRef.current);
          streamingTimerRef.current = null;
        }
        if (onComplete) {
          onComplete();
        }
      }
    }, 50); // 每50ms添加一个字符
  }, []);

  // 当voiceState变为listening时，将current移到previous
  useEffect(() => {
    if (voiceState === 'listening' && currentMessage) {
      setPreviousMessage(currentMessage);
      setCurrentMessage('');
    }
  }, [voiceState, currentMessage]);

  const { data: personasResponse } = useAutoCache(aiChatServer.getPersonas, []);
  const personas = personasResponse?.data || [];

  useEffect(() => {
    let cancelled = false;

    const normalizeModel = (entry: any): string | null => {
      if (!entry) {
        return null;
      }
      if (typeof entry === "string") {
        return entry;
      }
      if (typeof entry === "object") {
        const id =
          entry.id ??
          entry.modelId ??
          entry.value ??
          entry.code ??
          entry.name ??
          entry.key;
        if (!id) {
          return null;
        }
        return String(id);
      }
      return null;
    };

    const loadModels = async () => {
      try {
        setIsLoadingModels(true);
        const response = await aiChatServer.getAllModels({});
        const raw = await (async () => {
          if (typeof (response as any)?.json === "function") {
            return await (response as any).json();
          }
          return response as any;
        })();

        const payload = raw?.data ?? raw ?? {};
        const candidateArrays = [
          payload?.all,
          payload?.models,
          payload?.items,
          Array.isArray(payload) ? payload : null,
        ];

        const source = candidateArrays.find((item) => Array.isArray(item)) ?? [];
        const normalized = Array.from(
          new Set(
            (source as any[]) 
              .map(normalizeModel)
              .filter((item): item is string => Boolean(item))
          )
        );

        if (cancelled || normalized.length === 0) {
          return;
        }

        const defaultIdCandidate =
          payload?.default ??
          payload?.defaultModel ??
          payload?.selected ??
          payload?.preferred ??
          raw?.default ??
          normalized[0];

        if (cancelled) {
          return;
        }

        setModelOptions(normalized);
        setSelectedModel((prev) => {
          if (prev && normalized.includes(prev)) {
            return prev;
          }
          if (
            defaultIdCandidate &&
            normalized.includes(String(defaultIdCandidate))
          ) {
            return String(defaultIdCandidate);
          }
          return normalized[0];
        });
      } catch (error) {
        console.error("加载模型列表失败:", error);
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
  const handlePersonaSwitch = useCallback(async (personaId: string) => {
    const persona = personas.filter(persona => persona.persona_id === personaId)[0];
    if (!currentSessionId) {
      // 如果没有会话，直接切换选中的人设
      setSelectedPersona(persona);
      return;
    }

    try {
      const response = await aiChatServer.switchPersona({
        sessionId: currentSessionId,
        personaId: persona.persona_id
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
  }, [currentSessionId]);


  // Mock演示函数：模拟用户语音输入和AI回复
  const triggerMockDemo = useCallback(() => {
    // 清除之前的定时器
    if (streamingTimerRef.current) {
      clearInterval(streamingTimerRef.current);
    }

    // 1. 用户输入 (listening)
    setVoiceState('listening');
    streamText('用户：请帮我解释一下React的useState是什么？', () => {
      // 2. 等待1秒，切换到buffering状态
      setTimeout(() => {
        setVoiceState('buffering');

        // 3. 再等待1秒，开始AI回复
        setTimeout(() => {
          setVoiceState('speaking');
          streamText('AI：useState是React的一个Hook，它允许你在函数组件中添加state。它接受初始state作为参数，返回一个包含当前state值和更新state的函数的数组。', () => {
            // 4. 等待2秒，切换回listening状态（这会触发previous message更新）
            setTimeout(() => {
              setVoiceState('listening');
            }, 2000);
          });
        }, 1000);
      }, 1000);
    });
  }, [streamText]);

  // 加载历史记录
  const loadChatHistory = useCallback(async () => {
    try {
      // 如果sectionId为空，不读取历史记录，直接显示欢迎消息
      if (!sectionId) {
        console.log("sectionId为空，跳过加载历史记录（日常对话模式）");
        setMessages([
          {
            id: nanoid(),
            content:
              "Hello! I'm your AI assistant. I can help you with coding questions, explain concepts, and provide guidance on web development topics. What would you like to know?",
            role: "assistant",
            timestamp: new Date(),
          },
        ]);
        setIsLoadingHistory(false);
        return;
      }

      setIsLoadingHistory(true);

      // 1. 获取用户在该章节的所有会话
      const sessionsResponse = await aiChatServer.getSessionsByUserAndSection(
        getUserId(),
        sectionId
      );
      console.log("用户章节会话列表:", sessionsResponse.data);

      let sessionId: string;
      let historyMessages: ChatMessage[] = [];

      // 2. 如果有现有会话，使用最新的
      if (
        sessionsResponse.data.data.sessions &&
        sessionsResponse.data.data.sessions.length > 0
      ) {
        sessionId = sessionsResponse.data.data.sessions[0].session_id;
        console.log("使用最新的会话ID:", sessionId);
        setCurrentSessionId(sessionId);
        // 保存到 localStorage
        if (sectionId) {
          localStorage.setItem(`ai-session-${sectionId}`, sessionId);
        }

        // 3. 获取并加载历史记录
        const historyResponse = await aiChatServer.getSessionHistory(
          sessionId,
          true
        );
        console.log("会话历史记录:", historyResponse.data);

        // 将历史记录转换为ChatMessage格式
        historyMessages = historyResponse.data.data.history.flatMap((msg) => {
          const userMsg: ChatMessage = {
            id: nanoid(),
            content: msg.user_message,
            role: "user",
            timestamp: new Date(msg.query_time),
          };

          const aiMsg: ChatMessage = {
            id: nanoid(),
            content: msg.ai_response,
            role: "assistant",
            timestamp: new Date(msg.query_time),
          };

          return [userMsg, aiMsg];
        });

        console.log(`加载了 ${historyMessages.length / 2} 条历史对话`);
      } else {
        console.log("没有找到现有会话，将在发送第一条消息时创建");
        // 显示欢迎消息
        historyMessages = [
          {
            id: nanoid(),
            content:
              "Hello! I'm your AI assistant. I can help you with coding questions, explain concepts, and provide guidance on web development topics. What would you like to know?",
            role: "assistant",
            timestamp: new Date(),
            sources: [
              { title: "Getting Started Guide", url: "#" },
              { title: "API Documentation", url: "#" },
            ],
          },
        ];
      }

      setMessages(historyMessages);
    } catch (error) {
      console.error("加载历史记录失败:", error);
      // 显示错误提示或默认消息
      setMessages([
        {
          id: nanoid(),
          content: "Hello! I'm your AI assistant. What would you like to know?",
          role: "assistant",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [sectionId]);

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
        if (typeof text === "string") {
          setInputValue(text);
          // Try to focus the textarea inside this component
          const textarea = containerRef.current?.querySelector(
            'textarea[name="message"]'
          ) as HTMLTextAreaElement | null;
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
    return () =>
      window.removeEventListener(SEND_TO_AI, handler);
  }, []);

  // Listen for chat history refresh requests
  useEffect(() => {
    const handler = () => {
      loadChatHistory();
    };

    window.addEventListener("ai-refresh-history", handler as EventListener);
    return () =>
      window.removeEventListener("ai-refresh-history", handler as EventListener);
  }, [loadChatHistory]);

  const processStreamResponse = useCallback(
    async (
      messageId: string,
      opts: {
        sessionId: string;
        sectionId?: string;
        personaId?: string;
        message?: string;
        customRequest?: { stream: () => AsyncIterable<any> };
        modelName?: string;
      }
    ) => {
      const request =
        opts.customRequest ??
        aiChatServer.chatStream({
          userId: getUserId(),
          message: opts.message ?? "",
          sessionId: opts.sessionId,
          sectionId: opts.sectionId ?? "",
          personaId: opts.personaId,
          modelName: opts.modelName ?? (selectedModel || undefined),
          daily: !sectionId, // 如果sectionId为空，设置daily=true
        });

      try {
        for await (const res of request.stream()) {
          if ((res as any)?.error) {
            console.error("AI Chat Stream Error:", (res as any).error);
            continue;
          }

          const payload = (res as any)?.result ?? res;

          // 使用 ts-pattern 进行模式匹配处理响应格式
          const textChunk = match(payload)
            .with({ data: { ai_response: P.select(P.string) } }, (str) => {
              console.log("Found ai_response in data:", str);
              return str;
            })
            .with({ ai_response: P.select(P.string) }, (str) => {
              console.log("Found ai_response:", str);
              return str;
            })
            .with({ content: P.select(P.string) }, (str) => {
              console.log("Found content:", str);
              return str;
            })
            .with(
              {
                choices: [
                  { delta: { content: P.select(P.string) } },
                  ...P.array(),
                ],
              },
              (str) => {
                console.log("Found OpenAI format:", str);
                return str;
              }
            )
            .with(P.string.startsWith("data: "), (dataStr) => {
              const str = dataStr?.replace("data: ", "") ?? "";
              console.log("Using 'data: ' content:", str);
              return str;
            })
            .with(P.string, (str) => {
              console.log("Using raw string:", str);
              return str?.replace("data: ", "") ?? "";
            })
            // 未匹配到的格式
            .otherwise((data) => {
              console.log("No recognized format, parsed object:", data);
              return null;
            });

          if (!textChunk) {
            continue;
          }

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id !== messageId) {
                return msg;
              }

              const segments = textChunk
                .split(/(?<=\n)/)
                .filter((segment) => segment.length > 0);

              const updatedContent = segments.reduce((acc, segment) => {
                const trimmedSegment = segment.trimStart();
                if (trimmedSegment.startsWith("#") || trimmedSegment.startsWith("-") || trimmedSegment.startsWith("*") || /^\d+\.\s/.test(trimmedSegment)) {
                  const separator = acc.endsWith("\n") ? "" : "\n";
                  return acc + separator + trimmedSegment;
                }
                return acc + segment;
              }, msg.content);

              return {
                ...msg,
                content: updatedContent,
                isStreaming: true,
              };
            })
          );
        }

        // Mark streaming as complete
        setMessages((prev) =>
          prev.map((msg) => {
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
        console.error("Stream processing error:", error);
      } finally {
        setIsTyping(false);
        setStreamingMessageId(null);
      }
    },
    [sectionId, selectedModel]
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent)?.detail as
        | {
            userId?: string;
            sectionId?: string;
            sessionId?: string;
          }
        | undefined;

      if (!detail) {
        return;
      }

      const resolvedSectionId = detail.sectionId ?? sectionId ?? "";
      const resolvedSessionId =
        detail.sessionId ??
        currentSessionId ??
        (resolvedSectionId ? localStorage.getItem(`ai-session-${resolvedSectionId}`) : null);

      const resolvedUserId = detail.userId ?? getUserId();

      if (!resolvedSessionId || !resolvedUserId) {
        console.warn("[learning-review] missing identifiers", {
          resolvedSessionId,
          resolvedUserId,
          resolvedSectionId,
        });
        return;
      }

      if (resolvedSessionId !== currentSessionId) {
        setCurrentSessionId(resolvedSessionId);
      }

      const summaryPrompt = "请针对课程学习情况进行总结";
      const userMessage: ChatMessage = {
        id: nanoid(),
        content: summaryPrompt,
        role: "user",
        timestamp: new Date(),
      };

      const assistantMessageId = nanoid();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        content: "",
        role: "assistant",
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsTyping(true);
      setStreamingMessageId(assistantMessageId);

      const reviewRequest = aiChatServer.learningReview({
        userId: resolvedUserId,
        sectionId: resolvedSectionId,
        sessionId: resolvedSessionId,
        modelName: selectedModel || undefined,
      });

      void processStreamResponse(assistantMessageId, {
        sessionId: resolvedSessionId,
        sectionId: resolvedSectionId,
        customRequest: reviewRequest,
        modelName: selectedModel || undefined,
      });
    };

    window.addEventListener(AI_LEARNING_REVIEW, handler as EventListener);

    return () => {
      window.removeEventListener(AI_LEARNING_REVIEW, handler as EventListener);
    };
  }, [currentSessionId, sectionId, selectedModel, processStreamResponse]);

  const simulateTyping = useCallback(
    (
      messageId: string,
      content: string,
      reasoning?: string,
      sources?: Array<{ title: string; url: string }>
    ) => {
      let currentIndex = 0;
      const typeInterval = setInterval(() => {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId) {
              const currentContent = content.slice(0, currentIndex);
              return {
                ...msg,
                content: currentContent,
                isStreaming: currentIndex < content.length,
                reasoning:
                  currentIndex >= content.length ? reasoning : undefined,
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
    },
    []
  );
  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      event.preventDefault();

      if (!inputValue.trim() || isTyping) return;

      const currentInput = inputValue.trim();

      // Add user message
      const userMessage: ChatMessage = {
        id: nanoid(),
        content: currentInput,
        role: "user",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setIsTyping(true);

      // Process AI response with real streaming
      setTimeout(async () => {
        try {
          // 如果没有sessionId，先创建一个
          let sessionId = currentSessionId;
          if (!sessionId) {
            console.log("创建新会话...");
            const response = await aiChatServer.new({
              userId: getUserId(),
              sectionId: sectionId ?? "",
            });
            sessionId = response.data.data.session_id;
            setCurrentSessionId(sessionId);
            // 保存到 localStorage
            if (sectionId) {
              localStorage.setItem(`ai-session-${sectionId}`, sessionId);
            }
            console.log("新会话创建成功:", sessionId);
          }

          const assistantMessageId = nanoid();

          const assistantMessage: ChatMessage = {
            id: assistantMessageId,
            content: "",
            role: "assistant",
            timestamp: new Date(),
            isStreaming: true,
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setStreamingMessageId(assistantMessageId);

          // Start real stream processing
          await processStreamResponse(assistantMessageId, {
            message: currentInput,
            sessionId,
            sectionId,
            personaId: selectedPersona?.persona_id,
            modelName: selectedModel || undefined,
          });
        } catch (error) {
          console.error("AI Chat Error:", error);
          setIsTyping(false);
          setStreamingMessageId(null);

          // Add error message
          const errorMessage: ChatMessage = {
            id: nanoid(),
            content: "Sorry, I encountered an error. Please try again.",
            role: "assistant",
            timestamp: new Date(),
            isStreaming: false,
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      }, 300);
    },
    [
      inputValue,
      isTyping,
      currentSessionId,
      sectionId,
      selectedPersona,
      selectedModel,
      processStreamResponse,
    ]
  );

  const handleReset = useCallback(() => {
    loadChatHistory();
    setInputValue("");
    setIsTyping(false);
    setStreamingMessageId(null);
  }, [loadChatHistory]);

  // 新建会话
  const handleNewSession = useCallback(async () => {
    try {
      console.log("创建新会话...");

      // 调用后端创建新会话
      const response = await aiChatServer.new({
        userId: getUserId(),
        sectionId: sectionId ?? "",
      });

      console.log("新会话创建成功:", response.data);
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
          role: "assistant",
          timestamp: new Date(),
        },
      ]);
      setInputValue("");
      setIsTyping(false);
      setStreamingMessageId(null);

      console.log("已切换到新会话:", newSessionId);
    } catch (error) {
      console.error("创建新会话失败:", error);
    }
  }, [sectionId]);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full flex-col overflow-hidden rounded-xl border bg-background shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <FileTextIcon />
          <span className="font-medium text-base">AI对话框</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewSession}
          disabled={isTyping}
        >
          新建对话
        </Button>
      </div>

      {/* Voice Mode or Text Mode */}
      {isVoiceMode ? (
        <>
          <Item variant="outline" className="m-4 mb-0" size="sm">
            <ItemMedia>
              <Fingerprint className="size-5" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{selectedPersona ? selectedPersona.name : '默认人设'}</ItemTitle>
            </ItemContent>
            <ItemActions>
              AI人设
            </ItemActions>
          </Item>
          <VoiceUI
            userId={getUserId()}
            sessionId={currentSessionId || ""}
            sectionId={sectionId || ""}
            personaId={selectedPersona?.persona_id}
            serverUrl={getWebRTCServerUrl()}
            onClose={() => {
              setIsVoiceMode(false);
            }}
          />
        </>
      ) : (
        /* Text Mode - Conversation Area */
        <>
          {/* AI Settings and Model Selection */}
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <div className="flex items-center flex-1 h-10">
              <Select value={selectedPersona?.persona_id} onValueChange={handlePersonaSwitch}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="默认人设" />
                </SelectTrigger>
                <SelectContent>
                  {personas.map((persona) => (
                    <SelectItem key={persona.persona_id} value={persona.persona_id}>
                      {persona.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center min-w-[160px] h-10">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger
                  className="w-full"
                  disabled={isLoadingModels || modelOptions.length === 0}
                >
                  <SelectValue
                    placeholder={isLoadingModels ? "加载模型..." : "未选择"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((modelId) => (
                    <SelectItem key={modelId} value={modelId}>
                      {modelId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Conversation Area */}
          <Conversation className="flex-1">
            <ConversationContent className="space-y-4">
              {isLoadingHistory && (
                <div className="flex items-center justify-center py-4">
                  <Loader size={16} />
                  <span className="ml-2 text-muted-foreground text-sm">
                    Loading chat history...
                  </span>
                </div>
              )}
              {messages.map((message) => (
                <div key={message.id} className="space-y-3">
                  <Message from={message.role}>
                    <MessageContent>
                      {message.isStreaming && message.content === "" ? (
                        <div className="flex items-center gap-2">
                          <Loader size={14} />
                          <span className="text-muted-foreground text-sm">
                            Thinking...
                          </span>
                        </div>
                      ) : message.role === "assistant" ? (
                        <Response>{message.content}</Response>
                      ) : (
                        <p className="leading-7">{message.content}</p>
                      )}
                    </MessageContent>
                    <MessageAvatar
                      src={
                        message.role === "user"
                          ? "https://github.com/dovazencot.png"
                          : "https://github.com/vercel.png"
                      }
                      name={message.role === "user" ? "User" : "AI"}
                    />
                  </Message>
                  {/* Reasoning */}
                  {message.reasoning && (
                    <div className="ml-10">
                      <Reasoning
                        isStreaming={message.isStreaming}
                        defaultOpen={false}
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{message.reasoning}</ReasoningContent>
                      </Reasoning>
                    </div>
                  )}
                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="ml-10">
                      <Sources>
                        <SourcesTrigger count={message.sources.length} />
                        <SourcesContent>
                          {message.sources.map((source, index) => (
                            <Source
                              key={index}
                              href={source.url}
                              title={source.title}
                            />
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
          <div className="px-4 pt-1 pb-4 bg-white">
            {/* Toolbar buttons */}
            <div className="flex items-center gap-2 mb-3">
              <Button
                variant={'outline'}
                disabled={isTyping}
              >
                <MicIcon className="size-5 text-muted-foreground" />
              </Button>
              <Button
                variant={'outline'}
                disabled={isTyping}
              >
                <ArrowUpIcon className="size-5 text-muted-foreground" />
              </Button>
              <Button
                variant={'outline'}
                disabled={isTyping}
                onClick={() => setIsVoiceMode(true)}
              >
                <PhoneIcon className="size-5 text-muted-foreground" />
              </Button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Text input with embedded send Button */}
              <div className="relative">
                <Textarea
                  name="message"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (inputValue.trim() && !isTyping) {
                        handleSubmit(e as any);
                      }
                    }
                  }}
                  placeholder="输入你的问题......"
                  disabled={isTyping}
                  className="w-full min-h-[120px] max-h-[300px]"
                  rows={1}
                />

                {/* Send Button inside input */}
                <Button
                  type="submit"
                  variant="ghost"
                  disabled={!inputValue.trim() || isTyping}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
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
