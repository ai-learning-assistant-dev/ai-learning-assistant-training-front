import { AlertCircle, CircleCheck, Disc } from "lucide-react";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export type Stage = "video" | "examination" | "compare";

interface SectionStageProps {
  stage: Stage;
  onClick?: (stage: Stage) => void;
  videoCompleted?: boolean;
  isExaminationPassed?: boolean;
  isReviewMode?: boolean;
}

const todo = '';
const doing = <Disc className="size-8" fill={"#4039FA"} color="white" size={28} />;
const finished = <CircleCheck className="size-8" fill={"#737373"} color="white" />;

export function SectionStage({ 
  stage, 
  onClick, 
  videoCompleted, 
  isExaminationPassed,
  isReviewMode = false 
}: SectionStageProps) {

  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [pendingStage, setPendingStage] = useState<Stage | null>(null);

  const isVideoButtonLocked = stage === "compare" && isReviewMode;
  const isExamButtonLocked = stage === "compare" && isReviewMode;

  const handleStageClick = (nextStage: Stage) => {
    if (nextStage === stage) {
      return;
    }

    // 如果按钮被锁定，则不执行任何操作
    if ((nextStage === "video" && isVideoButtonLocked) || 
        (nextStage === "examination" && isExamButtonLocked)) {
      return;
    }

    if (isReviewMode) {
      onClick?.(nextStage);
      return;
    }

    if (nextStage === "examination" && !videoCompleted) {
      setPendingStage(nextStage);
      setShowVideoDialog(true);
      return;
    }

    if (nextStage === "compare" && !isExaminationPassed) {
      setPendingStage(nextStage);
      setShowCompareDialog(true);
      return;
    }

    onClick?.(nextStage);
  };

  const handleConfirm = () => {
    if (pendingStage) {
      onClick?.(pendingStage);
    }
    if (pendingStage === "examination") {
      setShowVideoDialog(false);
    } else if (pendingStage === "compare") {
      setShowCompareDialog(false);
    }
    setPendingStage(null);
  };

  const handleCancel = () => {
    setShowVideoDialog(false);
    setShowCompareDialog(false);
    setPendingStage(null);
  };

  // 根据当前阶段和模式动态获取取消按钮文案
  const getCancelButtonText = () => {
    if (isReviewMode) {
      return '取消';
    }
    
    // 非复习模式下，根据当前阶段显示不同的文案
    switch (stage) {
      case 'video':
        return '继续观看视频';
      case 'examination':
        return '继续测验';
      case 'compare':
        return '继续对照学习';
      default:
        return '取消';
    }
  };

  // 根据当前阶段和模式动态获取确认按钮文案
  const getConfirmButtonText = () => {
    if (isReviewMode) {
      return '开始测验';
    }
    return '立即进入测验';
  };

  // 根据当前阶段和模式动态获取弹窗标题
  const getDialogTitle = () => {
    if (isReviewMode) {
      return '重新进行随堂测验';
    }
    return '确认进入随堂测验';
  };

  return (
    <>
      <div className="flex justify-end gap-2 w-full">
        <Button 
          variant={'secondary'} 
          className="text-base" 
          onClick={() => handleStageClick("video")}
          disabled={isVideoButtonLocked}
        >
          {stage == 'video' ? doing : finished}
          视频学习
        </Button>
        <Button 
          variant={'secondary'} 
          className="text-base" 
          onClick={() => handleStageClick("examination")}
          disabled={isExamButtonLocked}
        >
          {stage == 'video' ? todo : 
           stage == 'examination' ? doing : 
           finished}
          随堂测验
        </Button>
        
        <Button variant={'secondary'} className="text-base" onClick={() => handleStageClick("compare")}>
          {stage == 'compare' ? doing : todo}
          对照学习
        </Button>
      </div>

      {/* 视频未完成提示弹窗 */}
      <AlertDialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {getDialogTitle()}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {isReviewMode ? (
                <>
                  <p>您正在复习模式下重新进行随堂测验。</p>
                  <p className="text-blue-600 font-medium">
                    重新测验将更新您的学习记录，帮助巩固知识点。
                  </p>
                  <p className="text-sm text-muted-foreground">
                    您可以随时切换回视频学习或对照学习模式。
                  </p>
                </>
              ) : (
                <>
                  <p>您尚未完成视频学习，是否要提前进入测验？</p>
                  <p className="text-amber-600 font-medium">
                    建议先观看完整视频，以获得更好的学习效果和测验表现。
                  </p>
                  <p className="text-sm text-muted-foreground">
                    测验过程中，您可以随时返回视频，但这可能会中断您的答题节奏。
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>
              {getCancelButtonText()}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {getConfirmButtonText()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 切换到对照学习的确认弹窗 */}
      <AlertDialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              暂无法进入对照学习
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>请先完成随堂测验并通过评估后，方可进入对照学习。</p>
              <p className="text-amber-600 font-medium">
                对照学习将提供测验解析、知识点对比和个性化建议，需要基于您的测验结果生成。
              </p>
              <p className="text-sm text-muted-foreground">
                完成测验后，系统将自动评估并解锁此阶段。如果未通过，可返回视频复习。
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleCancel}>
              返回测验
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
