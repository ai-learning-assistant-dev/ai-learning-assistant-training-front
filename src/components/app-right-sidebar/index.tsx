import AiConversation from "../ai-conversation"
import "./index.css";
import { useContext } from "react";
import { ExaminationContext } from "../../contexts/examination-context";
import ExamAiSide from './exam-ai-side.png'

export function AppRightSidebar() {
  const { isExamination } = useContext(ExaminationContext);
  return (
    <div className="flex grow-0 shrink-0 w-[515px] h-100% py-2 pr-2 bg-gray-50 h-svh">
      {isExamination ? (
        <img
          src={ExamAiSide}
          alt="随堂测验进行中……"
          className="w-full h-full object-contain"
        />
      ) : (
        <AiConversation />
      )}
    </div>
  )
}
