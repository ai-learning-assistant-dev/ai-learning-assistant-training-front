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
  bgClass: string;
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
      bgClass: "bg-[image:linear-gradient(111.42deg,rgba(183,186,215,0.36)_33.59%,rgba(183,186,215,0.5)_85.04%),linear-gradient(#ffffff,#ffffff),linear-gradient(180deg,#ffffff_0%,#535353_100%)]",
    },
    {
      title: "课程内容学习体验与改进建议调查问卷",
      description: "为确保课程内容更贴合您的学习目标与认知节奏，我们诚邀您参与本次调查。问卷将聚焦课程内容的实用性、难度适配性、结构合理性及学习收获等方面。",
      qrCode: qrCodeTwo,
      bgClass: "bg-[image:linear-gradient(289.31deg,rgba(251,180,100,0.5)_7.64%,rgba(251,180,100,0.61)_45.67%),linear-gradient(#ffffff,#ffffff),linear-gradient(180deg,#ffffff_0%,#535353_100%)]",
    },
  ];

  return <div className="h-[calc(100vh-112px)] font-sans pl-[27px] pt-[7px] pr-[27px] pb-[10px] flex flex-col overflow-hidden">
    <h1 className="text-xl font-bold text-[#171717]">反馈问卷</h1>
    <div className="grid grid-cols-2 gap-[15px] mt-[19px]">
      {questions.map((question) => (
        <div
          key={question.title}
          className={`w-full rounded-lg py-[8px] px-[10px] border border-transparent [background-clip:padding-box,padding-box,border-box] [background-origin:padding-box,padding-box,border-box] ${question.bgClass}`}
        >
          <div className="w-full text-center border-b font-medium leading-6 font-semibold border-black">{question.title}</div>
          <div className="w-full h-[80px] text-sm leading-5 text-center text-neutral-950/[70%] my-[17px] overflow-hidden line-clamp-4">{question.description}</div>
          <div
            className="flex justify-end items-center cursor-pointer"
            onClick={() => showQRDialog(question)}
          >
            <ArrowRight className="mr-[5px]" />
            <p className="text-black">进入问卷</p>
          </div>
        </div>
      ))}
    </div>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent
        className="w-[23.14vw] rounded-[16px]"
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="bg-[#D6CCEA] -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-[16px]">
          <DialogTitle className="text-center text-base">{currentQuestion?.title}</DialogTitle>
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
    <div className="w-full flex-1 flex justify-center items-center overflow-hidden">
      <img src={logoPng} alt="logo" className="w-full h-full opacity-70 object-contain" />
    </div>
  </div>
}

