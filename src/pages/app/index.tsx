import "./index.css";
import { AppLeftSidebar } from "@/components/app-left-sidebar";
import { AppRightSidebar } from "@/components/app-right-sidebar";
import { Outlet } from "react-router";
import { useState } from "react";
import { ExaminationContext } from "@/contexts/examination-context";

function App() {
  const [isExamination, setIsExamination] = useState(false);
  return (
    <ExaminationContext.Provider value={{ isExamination, setIsExamination }}>
      <div className="flex flex-row">
        <AppLeftSidebar>
          <Outlet />
        </AppLeftSidebar>
        <AppRightSidebar />
      </div>
    </ExaminationContext.Provider>
  )
}
 
export default App
