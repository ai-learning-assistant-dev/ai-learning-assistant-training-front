import { VideoPlayer } from "@/components/video-player";
import { useAutoCache } from "@/containers/auto-cache";
import { exerciseResultServer, sectionsServer } from "@/server/training-server";
import { useParams } from "react-router";
import { Response } from "@/components/ui/shadcn-io/ai/response";
import { SectionHeader } from "@/components/section-header";
import { SectionStage } from "@/components/section-stage";
import { Examination } from "@/components/examination";
import type { Stage } from "@/components/section-stage";
import { useState } from "react";
import { getLoginUser } from "@/containers/auth-middleware";

export function SectionDetail() {
  let params = useParams();
  const [stage, setStage] = useState<Stage>('video');
  const [trigger, setTrigger] = useState(1);
  const { loading, error, data } = useAutoCache(sectionsServer.getById.bind(sectionsServer), [{ section_id: params.sectionId }]);
  const {data: exerciseResult } = useAutoCache(
    exerciseResultServer.getExerciseResults, 
    [{user_id: getLoginUser()?.user_id,section_id: params.sectionId}], undefined, trigger
  );
  if (loading) {
    return <div>loading...</div>
  }
  if (error) {
    return <div>{error.message}</div>
  }

  const onPass = async (data: any)=>{
    setStage('compare')
  }

  const onFail = async (data: any)=>{
    setStage('video')
  }

  const changeStage = async (stage: Stage)=>{
    if(stage === 'video' || stage === 'examination' ){
      setStage(stage)
    }else{
      if(exerciseResult?.data.pass){
        setStage(stage);
      }
    }
  }

  if (loading === false && error == null) {
    const section = data.data;
    return (
      <div className="flex flex-col gap-4 px-6">
        <SectionHeader />
        <SectionStage stage={stage} onClick={changeStage}/>
        {stage !== 'examination' && <VideoPlayer url={section.video_url} />}
        {stage !== 'examination' && <Response className="text-base leading-relaxed">{section.knowledge_content}</Response>}
        {stage !== 'video' && <Examination onPass={onPass} onFail={onFail} />}
      </div>
    )
  }

}
