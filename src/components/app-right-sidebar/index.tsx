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
    <div className="flex grow-0 shrink-0 w-[515px] h-100% py-2 pr-2 bg-gray-50 h-svh">
      <AiConversation/>
    </div>
  )
}