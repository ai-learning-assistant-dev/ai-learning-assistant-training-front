import { HttpClient } from "@/lib/http-client";

export const serverHost = 'http://localhost:3000';

const modelEnum = [
  '/courses',
  '/chapters',
  '/sections',
  '/health',
  '/ai-chat',
  '/exercises'
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

export class AIChatServer extends TrainingServer<SessionInfo> {
  constructor() {
    super('/ai-chat');
  }
  new = async (data: CreateSessionRequest) => {
    return this.http.post<SessionInfo>('/sessions/new', data, { baseURL: this.baseUrl });
  }

  chat = async (data: ChatRequest) => {
    return this.http.post<ChatResponse>('/chat', data, { baseURL: this.baseUrl });
  }
}

export const aiChatServer = new AIChatServer();

export interface ExerciseResponse {
  exercise_id: string;
  section_id?: string | undefined;
  section?: SectionResponse | undefined;
  question: string;
  type_status: string;
  score: number;
  answer: string;
  options?: ExerciseOption[];
  isMultiple?: boolean;
}

export interface ExerciseOption {
  option_id: string;
  exercise_id: string;
  exercise: ExerciseResponse;
  option_text: string;
  is_correct: boolean;
}

class ExerciseServer extends TrainingServer<ExerciseResponse> {
  constructor() {
    super('/exercises');
  }

  getExercisesWithOptionsBySection = async (data: Partial<SectionResponse>) => {
    return (await this.http.post<Status<ExerciseResponse[]>>('/getExercisesWithOptionsBySection', data, { baseURL: this.baseUrl })).data;
  }
}

export const exerciseServer = new ExerciseServer();