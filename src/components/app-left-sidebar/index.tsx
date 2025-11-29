import { Calendar, Home, Inbox, Book, Search, Settings, CircleQuestionMark, VideoIcon, Gauge, User, UserPen } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Progress } from "@/components/ui/progress"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteHeader } from "./site-header"
import { getLoginUser } from "@/containers/auth-middleware"
// Menu items.
const topItems = [
  {
    title: "课程广场",
    url: "#/app/courseList",
    icon: Book,
  },
  // {
  //   title: "学习情况总揽",
  //   url: "#",
  //   icon: Gauge,
  // },
  // {
  //   title: "我的学习计划",
  //   url: "#",
  //   icon: Calendar,
  // },
  // {
  //   title: "课堂空间",
  //   url: "#",
  //   icon: VideoIcon,
  // },
]

// Menu items.
const bottomItems = [
  // {
  //   title: "设置",
  //   url: "#",
  //   icon: Settings,
  // },
  {
    title: "切换账户",
    url: "#/userList",
    icon: UserPen,
  },
  // {
  //   title: "获得帮助",
  //   url: "#",
  //   icon: CircleQuestionMark,
  // },
]

export function AppLeftSidebar({ children }: { children?: React.ReactNode }) {
  const user = getLoginUser();
  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <Sidebar variant="inset">
        <SidebarHeader className="p-0">
          <Card>
            <CardHeader>
              <CardTitle><User size={24} style={{ display: 'inline' }} />{user?.name}</CardTitle>
            </CardHeader>
            {/* <CardContent>
              <div className="flex justify-between items-center w-full">
                <div>LV5</div>
                <div>青铜电工</div>
              </div>
              <Progress value={30}></Progress>
            </CardContent> */}
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
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main center-scroll-container flex flex-1 flex-col gap-2">
            <div className="w-full flex flex-col gap-4 py-4 md:gap-6 md:py-6 h-[calc(100svh-64px)] overflow-auto scroll-area-viewport">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function scrollCenterTop() {
  const scrollElement = document.querySelector('.center-scroll-container .scroll-area-viewport');
  if (scrollElement) {
    (scrollElement as HTMLElement).scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}
