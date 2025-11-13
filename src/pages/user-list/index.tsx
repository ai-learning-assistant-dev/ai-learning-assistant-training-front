import { GalleryVerticalEnd } from "lucide-react"
import { SignupForm } from "@/components/signup-form"
import { LoginForm } from "@/components/login-form"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useAutoCache } from "@/containers/auto-cache";
import { userServer } from "@/server/training-server";
import logo from './logo.png';
import { useState } from "react";
import { loginUser } from "@/containers/auth-middleware";
import { useNavigate } from "react-router";


export default function UserList() {
  let navigate = useNavigate();
  const [trigger, setTrigger] = useState(1);
  const {data: userList} = useAutoCache(userServer.search, [{limit: 1000, page: 1}], undefined, trigger);
  async function loginOnSubmit(user_id: string){
    try{
      await loginUser(user_id);
      navigate("/app/courseList");
    }catch(e){
      alert(e);
    }
    
    
  }
  async function signupOnSubmit(name: string){
    const repeat = userList?.data.map(item=>item.name).includes(name)
    if(repeat){
      alert("账户重复");
    }else{
      const newUser = (await userServer.add({name})).data;
      setTrigger(trigger+1);
      await loginUser(newUser.user_id);
      navigate("/app/courseList");
    }
    
  }
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            AI学习助手知识培训
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <Tabs defaultValue="登陆账户">
              <TabsList>
                <TabsTrigger value="登陆账户">登陆账户</TabsTrigger>
                <TabsTrigger value="创建账户">创建账户</TabsTrigger>
              </TabsList>
              <TabsContent value="登陆账户">
                <LoginForm userList={userList?.data} onSubmit={loginOnSubmit}/>
              </TabsContent>
              <TabsContent value="创建账户">
                <SignupForm onSubmit={signupOnSubmit}/>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src={logo}
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}