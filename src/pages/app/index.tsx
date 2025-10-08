import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import AiConversation from "@/components/ai-conversation"
import "./index.css";
import { useAutoCache } from "@/containers/auto-cache";
import { sectionsServer } from "@/server/training-server";

function App() {
  const {loading, error, data} = useAutoCache(sectionsServer.list.bind(sectionsServer), []);
  return (
    <div className="flex w-full h-full flex-row gap-6">
      <Tabs defaultValue="account" className="w-[400px] grow">
        <TabsList>
          <TabsTrigger value="account">学习页</TabsTrigger>
          <TabsTrigger value="password">用户信息</TabsTrigger>
        </TabsList>
        <TabsContent value="account">{(loading === false && error == null)?JSON.stringify(data[0]):'loading...'}</TabsContent>
        <TabsContent value="password">用户信息<Button>Save</Button></TabsContent>
      </Tabs>
      <div className="w-[400px] h-full shrink-0">
        <AiConversation />
      </div>
    </div>
  )
}
 
export default App