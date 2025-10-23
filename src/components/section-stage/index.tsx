import { CircleCheck, Disc, LoaderCircle } from "lucide-react";
import { Button } from "../ui/button";

export function SectionStage(){
  return (
    <div className="flex justify-end gap-2 w-full">
      <Button variant={'secondary'} className="text-base" ><CircleCheck className="size-8" fill="#737373" color="white" />视频学习</Button>
      <Button variant={'secondary'} className="text-base"><Disc className="size-8" fill="#4039FA" color="white" size={28} />随堂测验</Button>
      <Button variant={'secondary'} className="text-base">对照学习</Button>
    </div>
)
}