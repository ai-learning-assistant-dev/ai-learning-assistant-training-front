import { userServer, type UserResponse } from "@/server/training-server";
import { createContext, redirect, RouterContextProvider } from "react-router";

const userContext = createContext<UserResponse>();

const USER_STORAGE_KEY = 'ala-training-user';

export async function loginUser(user_id: string) {
  const user = (await userServer.getById({user_id})).data;
  if(user && user.user_id){
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    return user;
  }{
    throw new Error("没找到用户");
  }
  
}

export function getLoginUser(): UserResponse | null {
  const userString = localStorage.getItem(USER_STORAGE_KEY);
  const user = userString ? JSON.parse(userString) as UserResponse : null;
  return user;
}

export async function authMiddleware({ context }: { context: Readonly<RouterContextProvider> }) {
  const user = getLoginUser();

  if (!user || !user.user_id) {
    throw redirect("/userList");
  }

  context.set(userContext, user);
};
