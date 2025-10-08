import Axios from "axios";
import type { AxiosResponse, AxiosRequestConfig } from "axios";

function rejectedInterceptor(error: any) {
  // do some things.
  // console.error(error);
  throw error;
}

Axios.interceptors.request.use(async (arc) => {
  return arc;
}, rejectedInterceptor);

Axios.interceptors.response.use(async (ar) => {
  return ar;
}, rejectedInterceptor);

/**
 * 隔离Axios，让程序未来可以容易更换网络库，也方便未来做统一鉴权功能
 */
export class HttpClient {
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return Axios.get<T>(url, config);
  }

  async post<T = any, R = any>(url: string, data?: R, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return Axios.post<T>(url, data, config);
  }

  async put<T = any, R = any>(url: string, data?: R, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return Axios.put<T>(url, data, config);
  }

  async delete(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return Axios.delete(url, config);
  }

  async download<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return Axios({
      url,
      method: "GET",
      responseType: "blob",
      ...config,
    });
  }

  async all<T = any>(request: any[]): Promise<AxiosResponse<T>[]> {
    return Axios.all(request);
  }
}

export const httpClient = new HttpClient();
