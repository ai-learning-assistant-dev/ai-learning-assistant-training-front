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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function SectionDetail() {
  let params = useParams();
  const [stage, setStage] = useState<Stage>('video');
  const [trigger, setTrigger] = useState(1);
  const { loading, error, data } = useAutoCache(sectionsServer.getById.bind(sectionsServer), [{ section_id: params.sectionId }]);
  const { data: exerciseResult } = useAutoCache(
    exerciseResultServer.getExerciseResults,
    [{ user_id: getLoginUser()?.user_id, section_id: params.sectionId }], undefined, trigger
  );
  if (loading) {
    return <div>loading...</div>
  }
  if (error) {
    return <div>{error.message}</div>
  }

  const onPass = async (data: any) => {
    setStage('compare')
  }

  const onFail = async (data: any) => {
    setStage('video')
  }

  const changeStage = async (nextStage: Stage) => {
    if(stage === 'video'){
      if(nextStage === 'examination'){
        setStage(nextStage)
      }
    }else if(stage === 'examination'){

    }else if(stage === 'compare'){

    }
  }

  if (loading === false && error == null) {
    const section = data.data;
    return (
      <div className="flex flex-col gap-4 px-6">
        <SectionHeader />
        <SectionStage stage={stage} onClick={changeStage} />
        {stage !== 'examination' && <VideoPlayer url={section.video_url} />}
        {stage !== 'examination' && (<Tabs defaultValue="doc">
          <TabsList>
            <TabsTrigger value="doc">知识点文案</TabsTrigger>
            {stage === 'compare' && <TabsTrigger value="examination">随堂测验</TabsTrigger>}
          </TabsList>
          <TabsContent value="doc">
            <Response className="text-base leading-relaxed">{section.knowledge_content}</Response>
          </TabsContent>
          {stage === 'compare' && (
            <TabsContent value="examination">
              <Examination onPass={onPass} onFail={onFail} />
            </TabsContent>
          )}
        </Tabs>)}
        {stage === 'examination' && <Examination onPass={onPass} onFail={onFail} />}
      </div>
    )
  }

}
