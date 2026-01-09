import { useState } from "react";
import { ArrowRight, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import logoPng from "@/assets/logo.png";
import qrCodeOne from "./qr-code-one.png";
import qrCodeTwo from "./qr-code-two.png";

interface Question {
  title: string;
  description: string;
  qrCode: string;
  background: string;
}

export function Questionnaire() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  function showQRDialog(question: Question) {
    setCurrentQuestion(question);
    setDialogOpen(true);
  }

  const questions: Question[] = [
    {
      title: "学习需求与功能体验综合调研问卷",
      description: "为优化 AI 学习助手的功能、资源与使用体验，精准匹配您的学习需求，我们特开展本次调研。内容将覆盖您的学习情况、意向领域、学习形式偏好、核心功能需求及使用体验",
      qrCode: qrCodeOne,
      background: "linear-gradient(111.42deg, rgba(183, 186, 215, 0.36) 33.59%, rgba(183, 186, 215, 0.5) 85.04%)",
    },
    {
      title: "课程内容学习体验与改进建议调查问卷",
      description: "为确保课程内容更贴合您的学习目标与认知节奏，我们诚邀您参与本次调查。问卷将聚焦课程内容的实用性、难度适配性、结构合理性及学习收获等方面。",
      qrCode: qrCodeTwo,
      background: "linear-gradient(289.31deg, rgba(251, 180, 100, 0.5) 7.64%, rgba(251, 180, 100, 0.61) 45.67%)",
    },
  ];

  return <div className="font-sans pl-[27px] pt-[7px] pr-[27px] pb-[10px]">
    <h1 className="text-xl font-bold text-[#171717]">反馈问卷</h1>
    <div className="grid grid-cols-2 gap-[15px] mt-[19px]">
      {questions.map((question) => (
        <div
          key={question.title}
          className="w-full rounded-lg py-[8px] px-[10px]"
          style={{
            background: question.background,
            border: "1px solid transparent",
          }}
        >
          <div className="w-full text-center border-b font-medium leading-6 font-semibold border-black">{question.title}</div>
          <p className="w-full text-sm leading-5 text-center text-neutral-950/[70%] py-[17px] overflow-hidden line-clamp-4">{question.description}</p>
          <div
            className="flex justify-end items-center cursor-pointer"
            onClick={() => showQRDialog(question)}
          >
            <ArrowRight className="mr-[5px]" />
            <p>进入问卷</p>
          </div>
        </div>
      ))}
    </div>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent
        className="w-[23.14vw] rounded-[16px]"
        aria-describedby={currentQuestion?.description}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="bg-[#D6CCEA] -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-[16px]">
          <DialogTitle className="text-center">{currentQuestion?.title}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <img src={currentQuestion?.qrCode} alt="问卷二维码" className="max-w-[200px]" />
        </div>
        <div className="flex items-center text-black/[60%] text-xs">
          <Info className="mr-[3px]" size={16} />
          <span>感谢你的宝贵建议</span>
        </div>
      </DialogContent>
    </Dialog>

    <div className="mt-[5.23vh] text-center leading-5 text-neutral-950/[70%]">
      <p>我们诚挚地邀请您参与本次问卷调查。</p>
      <p>您的每一条反馈和建议，都是我们不断完善和优化课程内容的宝贵动力。</p>
    </div>
    <div className="w-full flex justify-center">
      <img src={logoPng} alt="logo" className="h-[61.64vh] opacity-70" />
    </div>
  </div>
}

