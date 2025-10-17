import "./index.css";
import { AppLeftSidebar } from "@/components/app-left-sidebar";
import { AppRightSidebar } from "@/components/app-right-sidebar";
import { Outlet } from "react-router";

function App() {
  return (
    <div>
      <AppLeftSidebar>
        <AppRightSidebar/>
        <Outlet />
      </AppLeftSidebar>
    </div>
    
  )
}
 
export default App