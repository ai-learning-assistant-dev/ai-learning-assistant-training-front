import { VideoPlayer } from '@/components/video-player';
import { useAutoCache } from '@/containers/auto-cache';
import { aiChatServer, courseServer, exerciseResultServer, sectionsServer } from '@/server/training-server';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Response } from '@/components/ui/shadcn-io/ai/response';
import { SectionHeader } from '@/components/section-header';
import { SectionStage } from '@/components/section-stage';
import { Examination } from '@/components/examination';
import type { Stage } from '@/components/section-stage';
import { useEffect, useRef, useState } from 'react';
import { getLoginUser } from '@/containers/auth-middleware';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { aiLearningReview } from '@/components/ai-conversation';
import { scrollCenterTop } from '@/components/app-left-sidebar';

export function SectionDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const [stage, setStage] = useState<Stage>(mode === 'review' ? 'compare' : 'video');
  const [trigger, setTrigger] = useState(1);
  const { loading, error, data } = useAutoCache(sectionsServer.getById.bind(sectionsServer), [{ section_id: params.sectionId }]);
  const { data: courseData } = useAutoCache(courseServer.getCourseChaptersSections.bind(sectionsServer), [{ course_id: params.courseId, user_id: getLoginUser()?.user_id }]);
  const { loading: nextSectionLoading, data: nextSection } = useAutoCache(courseServer.getNextSections.bind(courseServer), [
    getLoginUser()?.user_id,
    params.courseId,
    params.sectionId,
  ]);
  const { data: exerciseResult } = useAutoCache(exerciseResultServer.getExerciseResults, [{ user_id: getLoginUser()?.user_id, section_id: params.sectionId }], undefined, trigger);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [isExaminationPassed, setIsExaminationPassed] = useState(mode === 'review' ? true : false);
  const [hasSubmittedExam, setHasSubmittedExam] = useState(false); 
  const learningReviewTriggeredRef = useRef(false);

  const unlocked = courseData?.data.chapters?.flatMap(chapter => chapter.sections || []).find(sec => sec.section_id === params.sectionId)?.unlocked;
  const isCompleted = unlocked === 2;
  const isReviewMode = isExaminationPassed || exerciseResult?.data?.pass === true || isCompleted || mode === 'review';

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 只在非导航场景下自动设置stage
    if (exerciseResult != null || courseData != null) {
      if (exerciseResult?.data.pass || isCompleted) {
        // 只有当前不是video状态时才自动切换
        if (stage !== 'video') {
          setStage('compare');
          setIsExaminationPassed(true);
        }
      }
    }
  }, [exerciseResult, courseData, isCompleted]);

  useEffect(() => {
    // 路由变化时重置stage
    if (mode !== 'review') {
      setStage(isCompleted ? 'compare' : 'video');
    }
  }, [params.sectionId]);

  useEffect(() => {
    setVideoCompleted(false);
    setIsExaminationPassed(mode === 'review' ? true : false);
    setHasSubmittedExam(false);
    setStage(mode === 'review' ? 'compare' : 'video');
    learningReviewTriggeredRef.current = false;
    setTrigger(prev => prev + 1);
  }, [params.sectionId, mode]);

  useEffect(() => {
    const run = async () => {
      if (loading || error || !data) {
        return;
      }

      if (stage !== 'compare') {
        learningReviewTriggeredRef.current = false;
        return;
      }

      const user = getLoginUser();
      let sessionId: string | null = localStorage.getItem(`ai-session-${params.sectionId}`);

      if (!user?.user_id || !params.sectionId) {
        console.error('[learning-review] skipped due to missing identifiers', {
          hasUserId: Boolean(user?.user_id),
          hasSectionId: Boolean(params.sectionId),
        });
        return;
      }

      if (sessionId === null) {
        const session = await aiChatServer.new({
          userId: user.user_id,
          sectionId: params.sectionId,
        });
        sessionId = session.data.data.session_id;
      }

      if (!sessionId) {
        console.error('[learning-review] skipped due to missing identifiers', {
          hasSession: Boolean(sessionId),
        });
        return;
      }

      if (learningReviewTriggeredRef.current) {
        return;
      }
      learningReviewTriggeredRef.current = true;

      aiLearningReview(user.user_id, params.sectionId, sessionId);
    };
    run();
  }, [stage, params.sectionId, loading, error, data]);

  if (loading) {
    return <div>loading...</div>;
  }
  if (error) {
    return <div>{error.message}</div>;
  }

  // 添加视频播放完成处理
  const handleVideoEnded = () => {
    setVideoCompleted(true);
  };

  const onPass = async () => {
    setIsExaminationPassed(true);
    setStage('compare');
    setTrigger(trigger + 1);
  };

  function onSubmittedExam(pass: boolean) {
    if(!pass) {
      setHasSubmittedExam(true);
    }
  }

  const onFail = async () => {
    setIsExaminationPassed(false);
    if (!isReviewMode) {
      setStage('video');
    }
    setTrigger(trigger + 1);
  };

  const changeStage = async (nextStage: Stage) => {
    if (isReviewMode) {
      setStage(nextStage);
      return;
    }

    if (exerciseResult?.data.pass) {
      setStage(nextStage);
    } else {
      if (stage === 'video') {
        if (nextStage === 'examination') {
          setStage(nextStage)
          setHasSubmittedExam(false);
        }
      } else if (stage === 'examination') {
        if (nextStage === 'video') {
          setStage(nextStage)
        }
      }
    }
  };

  const goToNextSection = async () => {
    if (nextSectionLoading) {
      return;
    }
    if (nextSection) {
      navigate(`/app/courseList/courseDetail/${params.courseId}/sectionDetail/${nextSection.section_id}`);
      scrollCenterTop();
    } else {
      navigate(`/app/courseList/courseDetail/${params.courseId}`);
    }
  };

  if (loading === false && error == null) {
    const section = data.data;
    let doc = section.knowledge_content || '';
    if(doc.indexOf('```') === 0) {
      doc = doc.replace('```','')
    }
    return (
      <div className='flex flex-col gap-4 px-6 w-full' ref={rootRef}>
        <SectionHeader />
        <SectionStage
          stage={stage}
          onClick={changeStage}
          videoCompleted={videoCompleted}
          isExaminationPassed={isExaminationPassed}
          isReviewMode={isReviewMode}
          hasSubmittedExam={hasSubmittedExam}
        />
        {stage !== 'examination' && (
          <>
            <VideoPlayer url={section.video_url} subtitles={section.video_subtitles} knowledge_points={section.knowledge_points} onEnded={handleVideoEnded} />
          </>
        )}
        {stage !== 'examination' && (
          <Tabs defaultValue='doc'>
            <TabsList>
              <TabsTrigger value='doc'>知识点文案</TabsTrigger>
              {stage === 'compare' && <TabsTrigger value='examination'>随堂测验</TabsTrigger>}
            </TabsList>
            <TabsContent value='doc'>
              <div className='flex'>
                <Response className='text-base leading-relaxed'>{doc}</Response>
              </div>
            </TabsContent>
            {stage === 'compare' && (
              <TabsContent value="examination">
                <Examination onPass={onPass} onFail={onFail} stage={stage} isReviewMode={isReviewMode} />
              </TabsContent>
            )}
          </Tabs>
        )}
        {stage === 'examination' && <Examination onPass={onPass} onFail={onFail} onSubmittedExam={onSubmittedExam} isReviewMode={isReviewMode} />}
        {stage === 'compare' && <Button
          onClick={goToNextSection}
          disabled={nextSectionLoading}
        >
          {nextSectionLoading ? "下一节内容加载中...." : "学习下一节课程"}
        </Button>}
      </div>
    );
  }
}
