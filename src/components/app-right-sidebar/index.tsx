import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import AiConversation from "../ai-conversation"
import { MessageSquare } from "lucide-react"
import "./index.css";

export function AppRightSidebar() {
  return (
    <Sheet>
      <SheetTrigger className="ai-message-icon"><MessageSquare/></SheetTrigger>
      <SheetContent>
        <AiConversation/>
      </SheetContent>
    </Sheet>
  )
}