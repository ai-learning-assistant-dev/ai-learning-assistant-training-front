import "./index.css";
import { AppLeftSidebar } from "@/components/app-left-sidebar";
import { AppRightSidebar } from "@/components/app-right-sidebar";
import { Outlet } from "react-router";

function App() {
  return (
    <div className="flex flex-row">
      <AppLeftSidebar>
        <Outlet />
      </AppLeftSidebar>
      <AppRightSidebar/>
    </div>
  )
}
 
export default App