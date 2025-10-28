'use client';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ui/shadcn-io/ai/conversation';
import { Loader } from '@/components/ui/shadcn-io/ai/loader';
import { Message, MessageAvatar, MessageContent } from '@/components/ui/shadcn-io/ai/message';
import {
  PromptInput,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ui/shadcn-io/ai/prompt-input';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ui/shadcn-io/ai/reasoning';
import { Source, Sources, SourcesContent, SourcesTrigger } from '@/components/ui/shadcn-io/ai/source';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MicIcon, PaperclipIcon, PlusIcon, RotateCcwIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import { type FormEventHandler, useCallback, useEffect, useState } from 'react';
import { aiChatServer, sectionsServer } from '@/server/training-server';
import { useAutoCache } from '@/containers/auto-cache';
import { useParams } from 'react-router';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

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
const USER_ID = "04cdc3f7-8c08-4231-9719-67e7f523e845";
const SECTION_ID = "4c4f637b-f088-4000-96d4-384411de2761";

async function testAIChatStream(message: string, sessionId: string){
  // 发送消息并获取流式响应
  const stream = await aiChatServer.chatStream({
    userId: USER_ID,
    sectionId: SECTION_ID,
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

  // 加载历史记录
  const loadChatHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      
      // 1. 获取用户在该章节的所有会话
      const sessionsResponse = await aiChatServer.getSessionsByUserAndSection(USER_ID, SECTION_ID);
      console.log('用户章节会话列表:', sessionsResponse.data);
      
      let sessionId: string;
      let historyMessages: ChatMessage[] = [];
      
      // 2. 如果有现有会话，使用最新的
      if (sessionsResponse.data.data.sessions && sessionsResponse.data.data.sessions.length > 0) {
        sessionId = sessionsResponse.data.data.sessions[0].session_id;
        console.log('使用最新的会话ID:', sessionId);
        setCurrentSessionId(sessionId);
        
        // 3. 获取并加载历史记录
        const historyResponse = await aiChatServer.getSessionHistory(sessionId);
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
            userId: USER_ID,
            sectionId: SECTION_ID,
          });
          sessionId = response.data.data.session_id;
          setCurrentSessionId(sessionId);
          console.log('新会话创建成功:', sessionId);
        }
        
        const stream = await testAIChatStream(currentInput, sessionId);
        
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
        userId: USER_ID,
        sectionId: SECTION_ID,
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
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-green-500" />
            <span className="font-medium text-sm">AI Assistant</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <span className="text-muted-foreground text-xs">
            {models.find(m => m.id === selectedModel)?.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleNewSession}
            className="h-8 px-2"
          >
            <PlusIcon className="size-4" />
            <span className="ml-1">New Chat</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleReset}
            className="h-8 px-2"
          >
            <RotateCcwIcon className="size-4" />
            <span className="ml-1">Reset</span>
          </Button>
        </div>
      </div>
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
      <div className="border-t p-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me anything about development, coding, or technology..."
            disabled={isTyping}
          />
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputButton disabled={isTyping}>
                <PaperclipIcon size={16} />
              </PromptInputButton>
              <PromptInputButton disabled={isTyping}>
                <MicIcon size={16} />
                <span>Voice</span>
              </PromptInputButton>
              <PromptInputModelSelect 
                value={selectedModel} 
                onValueChange={setSelectedModel}
                disabled={isTyping}
              >
                <PromptInputModelSelectTrigger>
                  <PromptInputModelSelectValue />
                </PromptInputModelSelectTrigger>
                <PromptInputModelSelectContent>
                  {models.map((model) => (
                    <PromptInputModelSelectItem key={model.id} value={model.id}>
                      {model.name}
                    </PromptInputModelSelectItem>
                  ))}
                </PromptInputModelSelectContent>
              </PromptInputModelSelect>
            </PromptInputTools>
            <PromptInputSubmit 
              disabled={!inputValue.trim() || isTyping}
              status={isTyping ? 'streaming' : 'ready'}
            />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
};
export default AiConversation;