import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "../ui/button";
import { SectionHeader } from "../section-header";
import { CircleProgress } from "../circle-progress";
import { BadgeCheck, BicepsFlexed } from "lucide-react";
import "./index.css";

export function ExamResultDialog(props: {
  open: boolean;
  pass: boolean;
  user_score: number;
  score: number;
  ai_feedback: string;
  onSubmit?: () => any
}) {
  return (
    <AlertDialog open={props.open} onOpenChange={(state)=> (state==true && props.onSubmit?props.onSubmit():null)}>
      <AlertDialogContent className="gap-8">
        <div className="exam-result-dialog-score flex gap-2">
          <CircleProgress 
            progress={props.user_score * 100 /props.score}
            progressColor={props.pass ? undefined : "#DC2626"}
          >
            {props.pass ? <BadgeCheck /> : <BicepsFlexed />}
          </CircleProgress>
          <div>{props.user_score}/{props.score}分</div>
        </div>
        <AlertDialogHeader className="gap-2">
          <AlertDialogTitle className="text-center">
            {props.pass ? "恭喜你通过本节测验！" : "还需努力！"}
          </AlertDialogTitle>
          <SectionHeader />
          <AlertDialogDescription className="text-center">
            {props.ai_feedback}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <Button onClick={props.onSubmit}>查看解析</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}