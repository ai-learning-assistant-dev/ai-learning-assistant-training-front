'use client';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ui/shadcn-io/ai/conversation';
import { Loader } from '@/components/ui/shadcn-io/ai/loader';
import { Message, MessageAvatar, MessageContent } from '@/components/ui/shadcn-io/ai/message';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ui/shadcn-io/ai/reasoning';
import { Source, Sources, SourcesContent, SourcesTrigger } from '@/components/ui/shadcn-io/ai/source';
import { cn } from '@/lib/utils';
import { MicIcon, ArrowUpIcon, PhoneIcon, MicOffIcon, XIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import { type FormEventHandler, useCallback, useEffect, useRef, useState } from 'react';
import { aiChatServer, sectionsServer } from '@/server/training-server';
import { useAutoCache } from '@/containers/auto-cache';
import { useParams } from 'react-router';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { getLoginUser } from '@/containers/auth-middleware';

type ChatMessage = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  reasoning?: string;
  sources?: Array<{ title: string; url: string }>;
  isStreaming?: boolean;
};
const models = [
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'llama-3.1-70b', name: 'Llama 3.1 70B' },
  { id: 'deepseek-v3.1', name: 'DeepSeek V3.1' },
];
const sampleResponses = [
  {
    content: "I'd be happy to help you with that! React is a powerful JavaScript library for building user interfaces. What specific aspect would you like to explore?",
    reasoning: "The user is asking about React, which is a broad topic. I should provide a helpful overview while asking for more specific information to give a more targeted response.",
    sources: [
      { title: "React Official Documentation", url: "https://react.dev" },
      { title: "React Developer Tools", url: "https://react.dev/learn" }
    ]
  },
  {
    content: "Next.js is an excellent framework built on top of React that provides server-side rendering, static site generation, and many other powerful features out of the box.",
    reasoning: "The user mentioned Next.js, so I should explain its relationship to React and highlight its key benefits for modern web development.",
    sources: [
      { title: "Next.js Documentation", url: "https://nextjs.org/docs" },
      { title: "Vercel Next.js Guide", url: "https://vercel.com/guides/nextjs" }
    ]
  },
  {
    content: "TypeScript adds static type checking to JavaScript, which helps catch errors early and improves code quality. It's particularly valuable in larger applications.",
    reasoning: "TypeScript is becoming increasingly important in modern development. I should explain its benefits while keeping the explanation accessible.",
    sources: [
      { title: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs" },
      { title: "TypeScript with React", url: "https://react.dev/learn/typescript" }
    ]
  }
];

// 用户和章节ID配置
function getUserId(){
  const user = getLoginUser();
  return user?user.user_id:"04cdc3f7-8c08-4231-9719-67e7f523e845";
};

async function testAIChatStream(message: string, sessionId: string, sectionId?: string){
  // 发送消息并获取流式响应
  const stream = await aiChatServer.chatStream({
    userId: getUserId(),
    sectionId: sectionId,
    message,
    sessionId
  });
  
  console.log('开始接收AI流式响应...');
  return stream;
}


const AiConversation = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState(models[0].id);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState<'listening' | 'buffering' | 'speaking'>('listening');
  const [currentMessage, setCurrentMessage] = useState('');
  const [previousMessage, setPreviousMessage] = useState('欢迎使用语音对话功能');
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
      if (!sectionId) { 
        setIsLoadingHistory(true);
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
        
        // 3. 获取并加载历史记录
        const historyResponse = await aiChatServer.getSessionHistory(sessionId, true);
        console.log('会话历史记录:', historyResponse.data);
        
        // 将历史记录转换为ChatMessage格式
        historyMessages = historyResponse.data.data.history.flatMap((msg) => {
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
      } else {
        console.log('没有找到现有会话，将在发送第一条消息时创建');
        // 显示欢迎消息
        historyMessages = [{
          id: nanoid(),
          content: "Hello! I'm your AI assistant. I can help you with coding questions, explain concepts, and provide guidance on web development topics. What would you like to know?",
          role: 'assistant',
          timestamp: new Date(),
          sources: [
            { title: "Getting Started Guide", url: "#" },
            { title: "API Documentation", url: "#" }
          ]
        }];
      }
      
      setMessages(historyMessages);
    } catch (error) {
      console.error('加载历史记录失败:', error);
      // 显示错误提示或默认消息
      setMessages([{
        id: nanoid(),
        content: "Hello! I'm your AI assistant. What would you like to know?",
        role: 'assistant',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // 组件挂载时加载历史记录
  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

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
        console.warn('ai-insert-text handler error', err);
      }
    };

    window.addEventListener('ai-insert-text', handler as EventListener);
    return () => window.removeEventListener('ai-insert-text', handler as EventListener);
  }, []);
  
  const processStreamResponse = useCallback(async (messageId: string, stream: ReadableStream) => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    console.log('Starting stream processing...');
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Stream completed');
          break;
        }
        
        // 解码数据块
        const chunk = decoder.decode(value, { stream: true });
        console.log('Received chunk:', chunk);
        buffer += chunk;
        
        // 尝试按行分割处理
        const lines = buffer.split('\n');
        
        // 保留最后一个可能不完整的行
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          console.log('Processing line:', line);
          
          try {
            // 尝试解析为JSON
            const parsed = JSON.parse(line);
            console.log('Parsed JSON:', parsed);
            
            // 处理不同的响应格式
            let textChunk = '';
            
            if (parsed.data && typeof parsed.data.ai_response === 'string') {
              // 格式: {"success":true,"data":{"ai_response":"文本内容"}}
              textChunk = parsed.data.ai_response;
              console.log('Found ai_response in data:', textChunk);
            } else if (typeof parsed.ai_response === 'string') {
              // 格式: {"ai_response":"文本内容"}
              textChunk = parsed.ai_response;
              console.log('Found ai_response:', textChunk);
            } else if (typeof parsed.content === 'string') {
              // 格式: {"content":"文本内容"}
              textChunk = parsed.content;
              console.log('Found content:', textChunk);
            } else if (typeof parsed === 'string') {
              // 纯文本
              textChunk = parsed;
              console.log('Using raw string:', textChunk);
            } else if (parsed.choices && parsed.choices[0]?.delta?.content) {
              // OpenAI格式: {"choices":[{"delta":{"content":"文本"}}]}
              textChunk = parsed.choices[0].delta.content;
              console.log('Found OpenAI format:', textChunk);
            } else {
              console.log('No recognized format, parsed object:', parsed);
            }
            
            if (textChunk) {
              setMessages(prev => prev.map(msg => {
                if (msg.id === messageId) {
                  return {
                    ...msg,
                    content: msg.content + textChunk,
                    isStreaming: true,
                  };
                }
                return msg;
              }));
            }
          } catch (e) {
            console.log('Not JSON, treating as plain text:', line);
            // 如果不是JSON，直接作为文本处理
            if (line.trim()) {
              setMessages(prev => prev.map(msg => {
                if (msg.id === messageId) {
                  return {
                    ...msg,
                    content: msg.content + line + '\n',
                    isStreaming: true,
                  };
                }
                return msg;
              }));
            }
          }
        }
      }
      
      // 处理剩余的buffer
      if (buffer.trim()) {
        console.log('Processing remaining buffer:', buffer);
        try {
          const parsed = JSON.parse(buffer);
          let textChunk = '';
          
          if (parsed.data && typeof parsed.data.ai_response === 'string') {
            textChunk = parsed.data.ai_response;
          } else if (typeof parsed.ai_response === 'string') {
            textChunk = parsed.ai_response;
          } else if (typeof parsed.content === 'string') {
            textChunk = parsed.content;
          }
          
          if (textChunk) {
            setMessages(prev => prev.map(msg => {
              if (msg.id === messageId) {
                return {
                  ...msg,
                  content: msg.content + textChunk,
                  isStreaming: true,
                };
              }
              return msg;
            }));
          }
        } catch (e) {
          console.log('Buffer is not valid JSON, ignoring');
        }
      }
      
      // Mark streaming as complete
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            isStreaming: false,
          };
        }
        return msg;
      }));
      
    } catch (error) {
      console.error('Stream processing error:', error);
    } finally {
      setIsTyping(false);
      setStreamingMessageId(null);
      reader.releaseLock();
    }
  }, []);

  const simulateTyping = useCallback((messageId: string, content: string, reasoning?: string, sources?: Array<{ title: string; url: string }>) => {
    let currentIndex = 0;
    const typeInterval = setInterval(() => {
      setMessages(prev => prev.map(msg => {
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
      }));
      currentIndex += Math.random() > 0.1 ? 1 : 0; // Simulate variable typing speed
      
      if (currentIndex >= content.length) {
        clearInterval(typeInterval);
        setIsTyping(false);
        setStreamingMessageId(null);
      }
    }, 50);
    return () => clearInterval(typeInterval);
  }, []);
  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(async (event) => {
    event.preventDefault();
    
    if (!inputValue.trim() || isTyping) return;
    
    const currentInput = inputValue.trim();
    
    // Add user message
    const userMessage: ChatMessage = {
      id: nanoid(),
      content: currentInput,
      role: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    // Process AI response with real streaming
    setTimeout(async () => {
      try {
        // 如果没有sessionId，先创建一个
        let sessionId = currentSessionId;
        if (!sessionId) {
          console.log('创建新会话...');
          const response = await aiChatServer.new({
            userId: getUserId(),
            sectionId: sectionId,
          });
          sessionId = response.data.data.session_id;
          setCurrentSessionId(sessionId);
          console.log('新会话创建成功:', sessionId);
        }
        
        const stream = await testAIChatStream(currentInput, sessionId, sectionId);
        
        if (!stream) {
          throw new Error('No stream received from server');
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
        
        // Start real stream processing
        await processStreamResponse(assistantMessageId, stream);
        
      } catch (error) {
        console.error('AI Chat Error:', error);
        setIsTyping(false);
        setStreamingMessageId(null);
        
        // Add error message
        const errorMessage: ChatMessage = {
          id: nanoid(),
          content: 'Sorry, I encountered an error. Please try again.',
          role: 'assistant',
          timestamp: new Date(),
          isStreaming: false,
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    }, 300);
  }, [inputValue, isTyping, currentSessionId, processStreamResponse]);
  
  const handleReset = useCallback(() => {
    loadChatHistory();
    setInputValue('');
    setIsTyping(false);
    setStreamingMessageId(null);
  }, [loadChatHistory]);

  // 新建会话
  const handleNewSession = useCallback(async () => {
    try {
      console.log('创建新会话...');
      
      // 调用后端创建新会话
      const response = await aiChatServer.new({
        userId: getUserId(),
        sectionId: sectionId,
      });
      
      console.log('新会话创建成功:', response.data);
      const newSessionId = response.data.data.session_id;
      
      // 清空当前消息并设置新的会话ID
      setCurrentSessionId(newSessionId);
      setMessages([
        {
          id: nanoid(),
          content: 'Hello! I\'m your AI assistant. How can I help you today?',
          role: 'assistant',
          timestamp: new Date(),
        }
      ]);
      setInputValue('');
      setIsTyping(false);
      setStreamingMessageId(null);
      
      console.log('已切换到新会话:', newSessionId);
    } catch (error) {
      console.error('创建新会话失败:', error);
    }
  }, []);

  return (
    <div ref={containerRef} className="flex h-full w-full flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="size-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 10H16M8 14H11M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="font-medium text-base">AI对话框</span>
        </div>
      </div>
      
      {/* AI Settings and Model Selection */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 flex-1">
          <svg className="size-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 6V3M12 21V18M18 12H21M3 12H6M16.95 16.95L19.07 19.07M4.93 4.93L7.05 7.05M7.05 16.95L4.93 19.07M19.07 4.93L16.95 7.05" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="text-sm">AI人设</span>
          <span className="font-medium text-sm ml-auto">暴躁老师傅</span>
          <svg className="size-4 text-muted-foreground ml-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        <div className="rounded-lg border bg-white px-3 py-2 flex items-center gap-2 min-w-[140px]">
          <span className="text-sm">{models.find(m => m.id === selectedModel)?.name || 'deepseek'}</span>
          <svg className="size-4 text-muted-foreground ml-auto" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      
      {/* Voice Mode or Text Mode */}
      {isVoiceMode ? (
        /* Voice Mode UI */
        <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-50 to-white p-8 relative">
          {/* Main Voice Interface */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Avatar */}
            <div className={cn(
              "w-30 h-30 rounded-full mb-8 flex items-center justify-center shadow-lg transition-all duration-500",
              voiceState === 'listening' && "bg-gradient-to-br from-blue-300 to-blue-400",
              voiceState === 'buffering' && "bg-gradient-to-br from-yellow-300 to-yellow-400",
              voiceState === 'speaking' && "bg-gradient-to-br from-green-300 to-green-400"
            )}>
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                voiceState === 'listening' && "bg-gradient-to-br from-blue-200 to-blue-300",
                voiceState === 'buffering' && "bg-gradient-to-br from-yellow-200 to-yellow-300",
                voiceState === 'speaking' && "bg-gradient-to-br from-green-200 to-green-300"
              )}>
                <div className="w-20 h-20 rounded-full bg-white/50"></div>
              </div>
            </div>
            
            {/* Status Text */}
            <p className="text-gray-500 text-lg mb-8">
              {voiceState === 'listening' && '正在听......'}
              {voiceState === 'buffering' && 'AI正在思考......'}
              {voiceState === 'speaking' && 'AI正在说......'}
            </p>
            {/* ASR Text Display Window */}
            <div className="w-full">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
                <div className="text-xs text-gray-400 mb-2">聊天记录</div>
                
                {/* Previous Message - Gray */}
                {previousMessage && (
                  <div className="text-sm text-gray-400 mb-4 pb-4 border-b border-gray-100">
                    {previousMessage}
                  </div>
                )}
                
                {/* Current Streaming Message - Black */}
                <div className="text-sm text-gray-900 whitespace-pre-wrap">
                  {currentMessage || '等待语音输入...'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Control Buttons - Fixed at bottom */}
          <div className="flex gap-2 justify-center pb-4">
            <button
              onClick={() => {
                // 点击发言按钮触发mock演示
                if (voiceState === 'listening') {
                  triggerMockDemo();
                }
              }}
              disabled={voiceState !== 'listening'}
              className={cn(
                "w-8 h-8 rounded-full bg-transparent hover:bg-gray-200/50 transition-colors flex items-center justify-center",
                voiceState !== 'listening' && "opacity-50 cursor-not-allowed"
              )}
            >
              {voiceState === 'listening' ? (
                <MicIcon className="w-4 h-4 text-gray-600" />
              ) : (
                <MicOffIcon className="w-4 h-4 text-gray-600" />
              )}
            </button>
            <button
              onClick={() => {
                setIsVoiceMode(false);
                setVoiceState('listening');
                setCurrentMessage('');
                setPreviousMessage('');
              }}
              className="w-8 h-8 rounded-full bg-transparent hover:bg-red-100/50 transition-colors flex items-center justify-center"
            >
              <XIcon className="w-4 h-4 text-red-500" />
            </button>
          </div>

        </div>
      ) : (
        /* Text Mode - Conversation Area */
        <>
      {/* Conversation Area */}
      <Conversation className="flex-1">
        <ConversationContent className="space-y-4">
          {isLoadingHistory && (
            <div className="flex items-center justify-center py-4">
              <Loader size={16} />
              <span className="ml-2 text-muted-foreground text-sm">Loading chat history...</span>
            </div>
          )}
          {messages.map((message) => (
            <div key={message.id} className="space-y-3">
              <Message from={message.role}>
                <MessageContent>
                  {message.isStreaming && message.content === '' ? (
                    <div className="flex items-center gap-2">
                      <Loader size={14} />
                      <span className="text-muted-foreground text-sm">Thinking...</span>
                    </div>
                  ) : message.role === 'assistant' ? (
                    <MarkdownRenderer content={message.content} />
                  ) : (
                    <p className="leading-7">{message.content}</p>
                  )}
                </MessageContent>
                <MessageAvatar 
                  src={message.role === 'user' ? 'https://github.com/dovazencot.png' : 'https://github.com/vercel.png'} 
                  name={message.role === 'user' ? 'User' : 'AI'} 
                />
              </Message>
              {/* Reasoning */}
              {message.reasoning && (
                <div className="ml-10">
                  <Reasoning isStreaming={message.isStreaming} defaultOpen={false}>
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
      <div className="px-4 pt-1 pb-4 bg-white">
        {/* Toolbar buttons */}
        <div className="flex items-center gap-2 mb-3">
          <button 
            type="button"
            className="px-4 py-1.5 hover:bg-muted rounded-2xl transition-colors border border-gray-200/50 bg-gray-50/30"
            disabled={isTyping}
          >
            <MicIcon className="size-5 text-muted-foreground" />
          </button>
          <button 
            type="button"
            className="px-4 py-1.5 hover:bg-muted rounded-2xl transition-colors border border-gray-200/50 bg-gray-50/30"
            disabled={isTyping}
          >
            <ArrowUpIcon className="size-5 text-muted-foreground" />
          </button>
          <button 
            type="button"
            className="px-4 py-1.5 hover:bg-muted rounded-2xl transition-colors border border-gray-200/50 bg-gray-50/30"
            disabled={isTyping}
            onClick={() => setIsVoiceMode(true)}
          >
            <PhoneIcon className="size-5 text-muted-foreground" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Text input with embedded send button */}
          <div className="relative">
            <textarea
              name="message"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (inputValue.trim() && !isTyping) {
                    handleSubmit(e as any);
                  }
                }
              }}
              placeholder="输入你的问题......"
              disabled={isTyping}
              className="w-full resize-none rounded-lg border bg-white px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px] max-h-[300px]"
              rows={1}
            />
            
            {/* Send button inside input */}
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="size-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12L19 12M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </form>
      </div>
      </>
      )}
    </div>
  );
};
export default AiConversation;