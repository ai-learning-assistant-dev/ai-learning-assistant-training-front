import { Calendar, Home, Inbox, Book, Search, Settings, CircleQuestionMark, VideoIcon, Gauge, User } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Progress } from "@/components/ui/progress"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
// Menu items.
const topItems = [
  {
    title: "课程广场",
    url: "/app/courseList",
    icon: Book,
  },
  {
    title: "学习情况总揽",
    url: "#",
    icon: Gauge,
  },
  {
    title: "我的学习计划",
    url: "#",
    icon: Calendar,
  },
  {
    title: "课堂空间",
    url: "#",
    icon: VideoIcon,
  },
]

// Menu items.
const bottomItems = [
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
  {
    title: "获得帮助",
    url: "#",
    icon: CircleQuestionMark,
  },
]

export function AppLeftSidebar({children}: {children?: React.ReactNode}) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Card>
            <CardHeader>
              <CardTitle><User size={24} style={{display: 'inline'}} />用户名</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center w-full">
                <div>LV5</div>
                <div>青铜电工</div>
              </div>
              <Progress value={30}></Progress>
            </CardContent>
          </Card>
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {topItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            {bottomItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <a href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <main>
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  )
}