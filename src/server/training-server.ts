import { HttpClient } from "@/lib/http-client";

const modelEnum = [
  '/courses',
  '/chapters',
  '/sections',
  '/health'
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
  constructor(model: typeof modelEnum[number] = '/health', schema: string = 'http://localhost:3000',) {
    this.http = new HttpClient()
    this.baseUrl = schema + model
  }
  search = async (data?: Partial<T> & PaginationParam) => {
    return (await this.http.post<Status<T[]>>('/search', data, { baseURL: this.baseUrl })).data;
  }
  getById = async (data: Partial<T>) => {
    return this.http.post<Status<T>>('/getById', data, { baseURL: this.baseUrl });
  }
  add = async (data: T) => {
    return this.http.post<Status<T>>('/add', data, { baseURL: this.baseUrl });
  }
  update = async (data: T) => {
    return this.http.post<Status<T>>('/update', data, { baseURL: this.baseUrl });
  }
  delete = async (data: T) => {
    return this.http.post<Status<T>>('/delete', data, { baseURL: this.baseUrl });
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

