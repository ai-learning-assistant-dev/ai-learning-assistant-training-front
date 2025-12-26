import { HttpClient } from "@/lib/http-client";
import hookFetch from "hook-fetch";
import { sseTextDecoderPlugin } from "hook-fetch/plugins/sse";

//export const serverHost = 'http://localhost:3000';
export const serverHost =
  window.location.protocol + "//" + window.location.host + "/api";

const modelEnum = [
  "/courses",
  "/chapters",
  "/sections",
  "/health",
  "/ai-chat",
  "/exercises",
  "/exercise-results",
  "/users",
  "/leading-questions",
] as const;

export interface Pagination {
  totalPages: number;
  total: number;
  limit: number;
  page: number;
}

export interface PaginationParam {
  limit: number;
  page: number;
}

export interface Status<T> {
  success: boolean;
  /** 200是正常 */
  statusCode: number;
  data: T;
  message: string;
  pagination: Pagination;
}

/** 调用技能培训后端接口的类，提供了基本的增删改查功能 */
export class TrainingServer<T> {
  http: HttpClient;
  baseUrl = "";
  constructor(
    model: (typeof modelEnum)[number] = "/health",
    schema: string = serverHost
  ) {
    this.http = new HttpClient();
    this.baseUrl = schema + model;
  }
  search = async (data?: Partial<T> & PaginationParam) => {
    return (
      await this.http.post<Status<T[]>>("/search", data, {
        baseURL: this.baseUrl,
      })
    ).data;
  };
  getById = async (data: Partial<T>) => {
    return (
      await this.http.post<Status<T>>("/getById", data, {
        baseURL: this.baseUrl,
      })
    ).data;
  };
  add = async (data: Partial<T>) => {
    return (
      await this.http.post<Status<T>>("/add", data, { baseURL: this.baseUrl })
    ).data;
  };
  update = async (data: Partial<T>) => {
    return (
      await this.http.post<Status<T>>("/update", data, {
        baseURL: this.baseUrl,
      })
    ).data;
  };
  delete = async (data: Partial<T>) => {
    return (
      await this.http.post<Status<T>>("/delete", data, {
        baseURL: this.baseUrl,
      })
    ).data;
  };
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
    super("/courses");
  }

  getCourseChaptersSections = async (
    data: Partial<CourseResponse & { user_id?: string }>
  ) => {
    return (
      await this.http.post<Status<CourseResponse>>(
        "/getCourseChaptersSections",
        data,
        { baseURL: this.baseUrl }
      )
    ).data;
  };

  getNextSections = async (
    user_id: string,
    courseId?: string,
    sectionId?: string
  ) => {
    if (!courseId || !sectionId) {
      return null;
    }
    const course = (
      await this.http.post<Status<CourseResponse>>(
        "/getCourseChaptersSections",
        { course_id: courseId, user_id },
        { baseURL: this.baseUrl }
      )
    ).data;
    const allSections: SectionResponse[] = [];
    if (course.data.chapters) {
      for (const chapter of course.data.chapters) {
        if (chapter.sections) {
          for (const section of chapter.sections) {
            allSections.push(section);
          }
        }
      }
    }
    const sectionIndex = allSections.findIndex(
      (section) => section.section_id === sectionId
    );
    if (sectionIndex == -1 || sectionIndex >= allSections.length) {
      return null;
    } else {
      return allSections[sectionIndex + 1];
    }
  };
}
export const courseServer = new CourseServer();

export interface ChapterResponse {
  chapter_id: string;
  course_id: string;
  title: string;
  chapter_order: number;
  /** 0: lock, 1: learning, 2: pass */
  unlocked: number;
  sections?: SectionResponse[];
}

/** 调用课程章接口的类，继承了基本增删改查的接口 */
export class ChapterServer extends TrainingServer<ChapterResponse> {
  constructor() {
    super("/chapters");
  }
}
export const chapterServer = new ChapterServer();

export type KnowledgePoints = {
  key_points?: {
    description: string;
    time: string;
    title: string;
  }[];
};
export interface Subtitle {
  end: string;
  seq: number;
  text: string;
  start: string;
}

export type SectionResponse = {
  section_id: string;
  title: string;
  chapter_id: string;
  video_url?: string;
  knowledge_points?: KnowledgePoints;
  video_subtitles?: Subtitle[];
  knowledge_content?: string;
  estimated_time?: number;
  section_order: number;
  /** 0: lock, 1: learning, 2: pass */
  unlocked: number;
};

/** 调用课程节数据接口的类，继承了基本增删改查的接口 */
export class SectionServer extends TrainingServer<SectionResponse> {
  constructor() {
    super("/sections");
  }
  /** 可以这样写调用后端复杂的接口 */
  someApi = async () => {
    return this.http.get("", { baseURL: this.baseUrl });
  };
}
export const sectionsServer = new SectionServer();

/**
 * 会话创建请求体
 */
interface CreateSessionRequest {
  userId: string;
  sectionId?: string;
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
 * AI聊天接口请求体，日常聊天复用该结构体
 */
interface ChatRequest {
  userId: string;
  sectionId: string;
  message?: string;
  personaId?: string;
  sessionId?: string;
  useAudio?: boolean;
  ttsOption?: string[];
  daily?: boolean;
  modelName?: string;
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

/**
 * AI人设信息
 */
export interface AiPersona {
  persona_id: string;
  name: string;
  prompt: string;
  is_default_template: boolean;
}

export interface LeadingQuestionResponse {
  question_id: string;
  section_id: string;
  question: string;
  // 如模型没有 answer 字段可去掉
}

/**
 * 切换人设请求
 */
interface SwitchPersonaRequest {
  sessionId: string;
  personaId: string;
}

/**
 * 切换人设响应
 */
interface SwitchPersonaResponse {
  success: boolean;
  message: string;
}

export class AIChatServer extends TrainingServer<SessionInfo> {
  //https://jsonlee12138.github.io/hook-fetch/docs/streaming/#%E4%BD%BF%E7%94%A8-sse-%E6%8F%92%E4%BB%B6

  constructor() {
    super("/ai-chat");
  }

  new = async (data: CreateSessionRequest) => {
    return this.http.post<Status<SessionInfo>>("/sessions/new", data, {
      baseURL: this.baseUrl,
    });
  };

  chat = async (data: ChatRequest) => {
    return this.http.post<Status<ChatResponse>>("/chat", data, {
      baseURL: this.baseUrl,
    });
  };

  textStream = async (
    path: string,
    data: ChatRequest,
    options?: {
      // splitSeparator?: string;
      // chunkSize?:number
      // chunkSpeed?:number
    }
  ) => {
    // const splitSeparator = options?.splitSeparator || "\n";

    const response = await fetch(`${this.baseUrl + path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const textStreamReader = response.body
      ?.pipeThrough(new TextDecoderStream())
      .getReader();
    if (textStreamReader == undefined)
      throw new Error("text stream body is null");

    const res = async function* () {
      try {
        while (true) {
          const { done, value } = await textStreamReader.read();
          if (done) break;
          yield value;
        }
      } finally {
        textStreamReader.releaseLock?.();
      }
    };
    return res();
  };

  textChatStream = (data: ChatRequest) => {
    return this.textStream("/chat/stream", data);
  };

  sseStream = (data: ChatRequest, splitSeparator = "\n") => {
    return hookFetch
      .create({
        plugins: [
          sseTextDecoderPlugin({
            json: true, // 自动解析 JSON
            prefix: "data: ", // 移除 "data: " 前缀
            splitSeparator, // 事件分隔符,默认\n\n
            lineSeparator: "\n", // 行分隔符
            trim: true, // 去除首尾空白
            doneSymbol: "[DONE]", // 结束标记
          }),
        ],
      })
      .post(`${this.baseUrl}/chat/stream`, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });
  };

  /**
   * 获取用户在指定章节的所有会话列表
   */
  getSessionsByUserAndSection = async (userId: string, sectionId?: string) => {
    return this.http.get<Status<UserSectionSessionsResponse>>(
      "/sessionID/by-user-section",
      {
        baseURL: this.baseUrl,
        params: { userId, sectionId },
      }
    );
  };

  /**
   * 获取会话的对话历史
   */
  getSessionHistory = async (sessionId: string, withoutInner: boolean) => {
    return this.http.get<Status<SessionHistoryResponse>>(
      `/history/${sessionId}`,
      { baseURL: this.baseUrl, params: { withoutInner } }
    );
  };

  /**
   * 获取当前课程所有人设列表
   */
  getPersonas = async (courseId?: string, userId?: string) => {
    return (
      await this.http.get<Status<AiPersona[]>>("/personas", {
        baseURL: this.baseUrl,
        params: {
          ...(courseId ? { courseId } : {}),
          ...(userId ? { userId } : {}),
        },
      })
    ).data;
  };

  /**
   * 切换当前会话的人设
   */
  switchPersona = async (data: SwitchPersonaRequest) => {
    return (
      await this.http.post<Status<SwitchPersonaResponse>>(
        "/switch-persona",
        data,
        { baseURL: this.baseUrl }
      )
    ).data;
  };

  /**
   * 生成学习总结评语
   */
  learningReview = (data: {
    userId: string;
    sectionId: string;
    sessionId: string;
    modelName?: string;
  }) => {
    return this.textStream("/learning-review", { ...data });
  };

  /**
   * 获取所有可用模型列表
   */
  getAllModels = () => {
    return this.http.get<{
      data: {
        all?: Array<{ id: string; name: string; displayName: string }>;
        default?: string;
      };
    }>(`${this.baseUrl}/models`);
  };
}

export const aiChatServer = new AIChatServer();

class LeadingQuestionServer extends TrainingServer<LeadingQuestionResponse> {
  constructor() {
    super("/leading-questions");
  }

  searchBySection = async (data: {
    section_id: string;
    page?: number;
    limit?: number;
  }) => {
    return this.http.post<Status<LeadingQuestionResponse[]>>(
      "/searchBySection",
      data,
      {
        baseURL: this.baseUrl,
      }
    );
  };
}

export const leadingQuestionServer = new LeadingQuestionServer();

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
  image?: string;
}

export interface ExerciseOption {
  option_id: string;
  exercise_id: string;
  exercise: ExerciseResponse;
  option_text: string;
  is_correct: boolean;
  image?: string;
}

class ExerciseServer extends TrainingServer<ExerciseResponse> {
  constructor() {
    super("/exercises");
  }

  getExercisesWithOptionsBySection = async (data: Partial<SectionResponse>) => {
    return (
      await this.http.post<Status<ExerciseResponse[]>>(
        "/getExercisesWithOptionsBySection",
        data,
        { baseURL: this.baseUrl }
      )
    ).data;
  };
}

export const exerciseServer = new ExerciseServer();

export interface Test {
  test_id: string;
  course_id?: string;
  course?: CourseResponse;
  type_status: string;
  title: string;
  testResults: TestResult[];
}

export interface TestResult {
  result_id: string;
  user_id: string;
  test_id: string;
  test: Test;
  start_date: string;
  end_date?: Date;
  score?: number;
  ai_feedback?: string;
}

export interface ExerciseResult {
  result_id: string;
  user_id: string;
  exercise_id: string;
  exercise: ExerciseResponse;
  test_result_id?: string;
  testResult?: TestResult;
  user_answer?: string;
  score?: number;
  ai_feedback?: string;
}

const exrciseResultExample = {
  pass: true,
  user_score: 60,
  score: 100,
  ai_feedback: "",
  results: [
    {
      exercise_id: "string",
      user_score: 6,
      core: 10,
      ai_feedback: "string",
      user_answer: "string",
    },
  ],
};

export type ExrciseResultCompose = typeof exrciseResultExample;

class ExerciseResultServer extends TrainingServer<ExerciseResponse> {
  constructor() {
    super("/exercise-results");
  }

  saveExerciseResults = async (data: {
    user_id: string;
    section_id?: string;
    test_result_id?: string;
    list: {
      exercise_id: string;
      user_answer?: string;
    }[];
  }) => {
    return (
      await this.http.post<Status<ExrciseResultCompose>>(
        "/saveExerciseResults",
        data,
        { baseURL: this.baseUrl }
      )
    ).data;
  };

  getExerciseResults = async (data: {
    user_id: string;
    section_id?: string;
    test_result_id?: string;
  }) => {
    return (
      await this.http.post<Status<ExrciseResultCompose>>(
        "/getExerciseResults",
        data,
        { baseURL: this.baseUrl }
      )
    ).data;
  };
}

export const exerciseResultServer = new ExerciseResultServer();

export interface UserResponse {
  user_id: string;
  name: string;
  avatar_url?: string;
  education_level?: string;
  learning_ability?: string;
  goal?: string;
  level?: number;
  experience?: number;
  current_title_id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/** 调用课程接口的类，继承了基本增删改查的接口 */
export class UserServer extends TrainingServer<UserResponse> {
  constructor() {
    super("/users");
  }
}
export const userServer = new UserServer();
