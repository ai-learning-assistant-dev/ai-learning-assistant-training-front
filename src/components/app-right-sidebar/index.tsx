import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import AiConversation from "../ai-conversation"

export function AppRightSidebar({children}: {children?: React.ReactNode}) {
  return (
    <SidebarProvider>
      <Sidebar side="right">
        <SidebarContent>
          <AiConversation />
        </SidebarContent>
      </Sidebar>
      <main>
        {children}
      </main>
    </SidebarProvider>
  )
}