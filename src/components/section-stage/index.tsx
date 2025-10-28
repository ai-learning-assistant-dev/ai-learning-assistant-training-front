import { CircleCheck, Disc } from "lucide-react";
import { Button } from "../ui/button";

export type Stage = "video" | "examination" | "compare";

const todo = '';
const doing = <Disc className="size-8" fill={"#4039FA"} color="white" size={28} />;
const finished = <CircleCheck className="size-8" fill={"#737373"} color="white" />
export function SectionStage({stage, onClick}: {stage: Stage, onClick?:(stage: Stage)=>any}){
  return (
    <div className="flex justify-end gap-2 w-full">
      <Button variant={'secondary'} className="text-base" onClick={()=>onClick&&onClick("video")}>
        {stage=='video'?doing:finished}
        视频学习
      </Button>
      <Button variant={'secondary'} className="text-base" onClick={()=>onClick&&onClick("examination")}>
        {stage=='video'&&todo}
        {stage=='examination'&&doing}
        {stage=='compare'&&finished}
        随堂测验
      </Button>
      <Button variant={'secondary'} className="text-base" onClick={()=>onClick&&onClick("compare")}>
        {stage=='compare'?doing:todo}
        对照学习
      </Button>
    </div>
)
}