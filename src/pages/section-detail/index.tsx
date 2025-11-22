import { VideoPlayer } from "@/components/video-player";
import { useAutoCache } from "@/containers/auto-cache";
import { courseServer, exerciseResultServer, sectionsServer } from "@/server/training-server";
import { useNavigate, useParams } from "react-router";
import { Response } from "@/components/ui/shadcn-io/ai/response";
import { SectionHeader } from "@/components/section-header";
import { SectionStage } from "@/components/section-stage";
import { Examination } from "@/components/examination";
import type { Stage } from "@/components/section-stage";
import { useEffect, useRef, useState } from "react";
import { getLoginUser } from "@/containers/auth-middleware";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { aiLearningReview } from "@/components/ai-conversation";

export function SectionDetail() {
  let params = useParams();
  let navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('video');
  const [trigger, setTrigger] = useState(1);
  const { loading, error, data } = useAutoCache(sectionsServer.getById.bind(sectionsServer), [{ section_id: params.sectionId }]);
  const { data: nextSection } = useAutoCache(courseServer.getNextSections.bind(courseServer),[getLoginUser()?.user_id, params.courseId, params.sectionId]);
  const { data: exerciseResult } = useAutoCache(
    exerciseResultServer.getExerciseResults,
    [{ user_id: getLoginUser()?.user_id, section_id: params.sectionId }], undefined, trigger
  );
  const learningReviewTriggeredRef = useRef(false);

  useEffect(()=>{
    if(exerciseResult != null){
      if(exerciseResult.data.pass){
        setStage('compare');
      }
    }

  },[exerciseResult])

  useEffect(() => {
    if (loading || error || !data) {
      return;
    }

    if (stage !== 'compare') {
      learningReviewTriggeredRef.current = false;
      return;
    }

    const user = getLoginUser();
    const sessionId = localStorage.getItem(`ai-session-${params.sectionId}`) || '';

    if (!user?.user_id || !params.sectionId || !sessionId) {
      console.warn('[learning-review] skipped due to missing identifiers', {
        hasUserId: Boolean(user?.user_id),
        hasSectionId: Boolean(params.sectionId),
        hasSessionId: Boolean(sessionId),
      });
      return;
    }

    if (learningReviewTriggeredRef.current) {
      return;
    }
    learningReviewTriggeredRef.current = true;

    aiLearningReview(user.user_id,params.sectionId,sessionId);
  }, [stage, params.sectionId, loading, error, data]);

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
    if(exerciseResult?.data.pass){
      setStage(nextStage);
    }else{
      if(stage === 'video'){
        if(nextStage === 'examination'){
          setStage(nextStage)
        }
      }else if(stage === 'examination'){
        
      }else if(stage === 'compare'){

      }
    }
    
  }

  const goToNextSection = async () => {
    if(nextSection){
      navigate(`/app/courseList/courseDetail/${params.courseId}/sectionDetail/${nextSection.section_id}`)
      setStage('video')
    }else{
      navigate(`/app/courseList/courseDetail/${params.courseId}`)
    }
  }

  if (loading === false && error == null) {
    const section = data.data;
    return (
      <div className="flex flex-col gap-4 px-6">
        <SectionHeader />
        <SectionStage stage={stage} onClick={changeStage} />
        {stage !== 'examination' && <>
          <VideoPlayer url={section.video_url} />
        </>}
        {stage !== 'examination' && (
          <Tabs defaultValue="doc">
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
          </Tabs>
        )}
        {stage === 'examination' && <Examination onPass={onPass} onFail={onFail} />}
        {stage === 'compare' && <Button onClick={goToNextSection}>学习下一节课程</Button>}
      </div>
    )
  }

}
