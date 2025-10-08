import React, { useState, useEffect, type JSX } from "react";

type AsyncReturnType<T extends (...args: any) => any> = T extends (...args: any) => Promise<infer U>
  ? U
  : T extends (...args: any) => infer U
  ? U
  : any;
/** 自动缓存数据并自动刷新缓存组件 */
export function AutoCache<T extends (...args: any) => Promise<any>>(props: {
  fetch: T;
  params: Parameters<T>;
  /** 接收数据的组件 */
  children(data: AsyncReturnType<T>): React.ReactNode;
  /** 初始化默认数据，解决接口数据加载前闪动问题 */
  initialData?: AsyncReturnType<T>;
  /** 强制刷新缓存 */
  trigger?: number | string;
}) {
  const [data, setData] = useState<AsyncReturnType<T> | undefined>(props.initialData);
  const [error, setError] = useState<Error>();
  useEffect(() => {
    props
      .fetch(...props.params)
      .then((obj) => {
        setData(obj);
        setError(undefined);
      })
      .catch(setError);
  }, [JSON.stringify(props.params), props.trigger]);
  if (error) {
    console.error(error);
    return <ErrorDom />;
  }
  if (data) {
    return (
      <MemoRender data={data} trigger={props.trigger}>
        {props.children}
      </MemoRender>
    );
  }
  return <LoadingDom />;
}

function ErrorDom(): JSX.Element {
  return <div className="error-box">无数据</div>;
}

function LoadingDom(): JSX.Element {
  return <div className="loading-box">加载中...</div>;
}

/** 解决trigger变化会导致渲染2次的问题 */
const MemoRender = React.memo(
  (props: { children: any; data: any; trigger: any }) => {
    return props.children(props.data) as React.ReactElement;
  },
  (pre, next) =>
    JSON.stringify(pre.data) === JSON.stringify(next.data) &&
    JSON.stringify(pre.trigger) === JSON.stringify(next.trigger) &&
    pre.children === next.children,
);

/** 自动缓存数据并自动刷新缓存组件 */
export function useAutoCache<T extends (...args: any) => Promise<any>>(
  fetch: T,
  params: Parameters<T>,
  /** 初始化默认数据，解决接口数据加载前闪动问题 */
  initialData?: AsyncReturnType<T>,
  /** 强制刷新缓存 */
  trigger?: number | string,
) {
  const [data, setData] = useState<AsyncReturnType<T> | undefined>(initialData);
  const [error, setError] = useState<Error>();
  useEffect(() => {
    fetch(...params)
      .then((obj) => {
        setData(obj);
        setError(undefined);
      })
      .catch(setError);
  }, [JSON.stringify(params), trigger]);
  if (error) {
    console.error(error);
    return {
      initialData,
      loading: false,
      error: error,
    } as const;
  }else if (data) {
    return {
      initialData,
      loading: false,
      data: data,
      error: undefined,
    } as const;
  }
  return {
    initialData,
    loading: true
  } as const;
}