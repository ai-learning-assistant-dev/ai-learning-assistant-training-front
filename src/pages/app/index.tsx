import AiConversation from "@/components/ai-conversation"
import "./index.css";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
  NavigationMenuViewport,
} from "@/components/ui/navigation-menu"
import { NavLink, Outlet } from "react-router";

function App() {
  return (
    <div className="flex w-full h-full flex-row gap-6">
      <div className="flex flex-col w-full h-full">
        <div className="flex w-full">
          <NavigationMenu>
            <NavigationMenuItem>
            <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
              <NavLink to="/app/courseList">课程</NavLink>
            </NavigationMenuLink>
            <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
              <NavLink to="/app/settings">设置</NavLink>
            </NavigationMenuLink>
          </NavigationMenuItem>
          </NavigationMenu>
        </div>
        <div className="flex w-full h-full overflow-auto">
          <Outlet />
        </div>
      </div>
      <div className="w-[400px] h-full shrink-0">
        <AiConversation />
      </div>
    </div>
  )
}
 
export default App