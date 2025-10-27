import { HttpClient } from "@/lib/http-client";

export const serverHost = 'http://localhost:3000';

const modelEnum = [
  '/courses',
  '/chapters',
  '/sections',
  '/health',
  '/ai-chat'
] as const;

export interface Pagination {
  totalPages: number,
  total: number,
  limit: number,
  page: number
}

export interface PaginationParam {
  limit: number,
  page: number
}

export interface Status<T>
{
  success: boolean,
  /** 200是正常 */
  statusCode: number,
  data: T,
  message: string,
  pagination: Pagination
}

/** 调用技能培训后端接口的类，提供了基本的增删改查功能 */
export class TrainingServer<T> {
  http: HttpClient;
  baseUrl = '';
  constructor(model: typeof modelEnum[number] = '/health', schema: string = serverHost,) {
    this.http = new HttpClient()
    this.baseUrl = schema + model
  }
  search = async (data?: Partial<T> & PaginationParam) => {
    return (await this.http.post<Status<T[]>>('/search', data, { baseURL: this.baseUrl })).data;
  }
  getById = async (data: Partial<T>) => {
    return (await this.http.post<Status<T>>('/getById', data, { baseURL: this.baseUrl })).data;
  }
  add = async (data: T) => {
    return (await this.http.post<Status<T>>('/add', data, { baseURL: this.baseUrl })).data;
  }
  update = async (data: T) => {
    return (await this.http.post<Status<T>>('/update', data, { baseURL: this.baseUrl })).data;
  }
  delete = async (data: T) => {
    return (await this.http.post<Status<T>>('/delete', data, { baseURL: this.baseUrl })).data;
  }

}

export interface CourseResponse {
  course_id: string;
  name: string;
  icon_url?: string;
  description?: string;
  default_ai_persona_id?: string;
  chapters?: ChapterResponse[];
}

/** 调用课程接口的类，继承了基本增删改查的接口 */
export class CourseServer extends TrainingServer<CourseResponse> {
  constructor() {
    super('/courses');
  }

  getCourseChaptersSections = async (data: Partial<CourseResponse>)=>{
    return (await this.http.post<Status<CourseResponse>>('/getCourseChaptersSections', data, { baseURL: this.baseUrl })).data;
  }
}
export const courseServer = new CourseServer();

export interface ChapterResponse {
  chapter_id: string;
  course_id: string;
  title: string;
  chapter_order: number;
  sections?: SectionResponse[];
}

/** 调用课程章接口的类，继承了基本增删改查的接口 */
export class ChapterServer extends TrainingServer<ChapterResponse> {
  constructor() {
    super('/chapters');
  }
}
export const chapterServer = new ChapterServer();

export type SectionResponse = {
  section_id: string;
  title: string;
  chapter_id: string;
  video_url?: string;
  knowledge_points?: string;
  video_subtitles?: string;
  knowledge_content?: string;
  estimated_time?: number;
  section_order: number;
}

/** 调用课程节数据接口的类，继承了基本增删改查的接口 */
export class SectionServer extends TrainingServer<SectionResponse> {
  constructor() {
    super('/sections');
  }
  /** 可以这样写调用后端复杂的接口 */
  someApi = async () => {
    return this.http.get('', { baseURL: this.baseUrl })
  }
}
export const sectionsServer = new SectionServer();

/**
 * 会话创建请求体
 */
interface CreateSessionRequest {
  userId: string;
  sectionId: string;
  personaId?: string;
}

interface SessionInfo {
  session_id: string;
  user_id: string;
  section_id: string;
  persona_id?: string;
  created_at: Date;
}

/**
 * AI聊天接口请求体
 */
interface ChatRequest {
  userId: string;
  sectionId: string;
  message: string;
  personaId?: string;
  sessionId?: string;
}

/**
 * AI聊天响应
 */
interface ChatResponse {
  interaction_id: string;
  user_id: string;
  section_id: string;
  session_id: string;
  user_message: string;
  ai_response: string;
  query_time: Date;
  persona_id_in_use?: string;
}

/**
 * 用户章节会话信息
 */
interface SessionSummary {
  session_id: string;
  interaction_count: number;
  first_interaction: Date;
  last_interaction: Date;
}

/**
 * 用户章节会话列表响应
 */
interface UserSectionSessionsResponse {
  user_id: string;
  section_id: string;
  session_count: number;
  sessions: SessionSummary[];
}

/**
 * 会话历史消息
 */
interface HistoryMessage {
  interaction_id: string;
  user_message: string;
  ai_response: string;
  query_time: Date;
  user_name?: string;
  section_title?: string;
  persona_name?: string;
}

/**
 * 会话历史响应
 */
interface SessionHistoryResponse {
  session_id: string;
  message_count: number;
  history: HistoryMessage[];
}

/**
 * AI流式聊天响应
 */
interface ChatStreamResponse {
  interaction_id: string;
  user_id: string;
  section_id: string;
  session_id: string;
  user_message: string;
  ai_response: ReadableStream;
  query_time: Date;
  persona_id_in_use?: string;
}

export class AIChatServer extends TrainingServer<SessionInfo> {
  constructor() {
    super('/ai-chat');
  }
  
  new = async (data: CreateSessionRequest) => {
    return this.http.post<Status<SessionInfo>>('/sessions/new', data, { baseURL: this.baseUrl });
  }

  chat = async (data: ChatRequest) => {
    return this.http.post<Status<ChatResponse>>('/chat', data, { baseURL: this.baseUrl });
  }

  chatStream = async (data: ChatRequest) => {
    // 使用 fetch API 来获取流式响应
    const response = await fetch(`${this.baseUrl}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // 直接返回原始流，让调用方处理
    return response.body;
  }

  /**
   * 获取用户在指定章节的所有会话列表
   */
  getSessionsByUserAndSection = async (userId: string, sectionId: string) => {
    return this.http.get<Status<UserSectionSessionsResponse>>(
      '/sessionID/by-user-section', 
      { 
        baseURL: this.baseUrl,
        params: { userId, sectionId }
      }
    );
  }

  /**
   * 获取会话的对话历史
   */
  getSessionHistory = async (sessionId: string) => {
    return this.http.get<Status<SessionHistoryResponse>>(
      `/history/${sessionId}`, 
      { baseURL: this.baseUrl }
    );
  }
}

export const aiChatServer = new AIChatServer();
