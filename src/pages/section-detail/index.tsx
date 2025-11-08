import { VideoPlayer } from "@/components/video-player";
import type { VideoPlayerHandle } from "@/components/video-player";
import { useAutoCache } from "@/containers/auto-cache";
import { exerciseResultServer, sectionsServer } from "@/server/training-server";
import { useParams } from "react-router";
import { Response } from "@/components/ui/shadcn-io/ai/response";
import { SectionHeader } from "@/components/section-header";
import { SectionStage } from "@/components/section-stage";
import { Examination } from "@/components/examination";
import type { Stage } from "@/components/section-stage";
import { useState, useRef } from "react";
import { getLoginUser } from "@/containers/auth-middleware";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import aiVideoAssistantImg from './ai_video_assistant.png'
import questionHereImg from './question_here.png'

export function SectionDetail() {
  let params = useParams();
  const [stage, setStage] = useState<Stage>('video');
  const [trigger, setTrigger] = useState(1);
  const { loading, error, data } = useAutoCache(sectionsServer.getById.bind(sectionsServer), [{ section_id: params.sectionId }]);
  const { data: exerciseResult } = useAutoCache(
    exerciseResultServer.getExerciseResults,
    [{ user_id: getLoginUser()?.user_id, section_id: params.sectionId }], undefined, trigger
  );
  // ref 用于按需获取播放进度（由用户手动触发）
  const playerRef = useRef<VideoPlayerHandle | null>(null);
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
        {stage !== 'examination' && <>
          <VideoPlayer url={section.video_url} ref={playerRef} />
        </>}
        {stage !== 'examination' && (<Tabs defaultValue="doc">
          <div className="flex w-full items-center justify-between">
            {/* Make the tabs area a fixed width so it doesn't sit tight against the progress button */}
            <TabsList className="flex-none w-56">
              <TabsTrigger value="doc">知识点文案</TabsTrigger>
              {stage === 'compare' && <TabsTrigger value="examination">随堂测验</TabsTrigger>}
            </TabsList>
            <div className="flex-none ml-3 flex items-center space-x-2">
              {/* Empty AI assistant button (left) */}
              <button type="button" className="w-24 h-8 p-0 bg-transparent border-0 flex items-center justify-center cursor-pointer focus:outline-none">
                <img src={aiVideoAssistantImg} alt="AI视频助手" className="max-w-full max-h-full" />
              </button>
              {/* Progress button replaced by image (right) */}
              <button type="button" onClick={() => {
                const p = playerRef.current?.getProgress();
                console.log('用户手动获取播放进度：', p);

                // Use player's current playback progress (seconds) and format as HH:MM:SS
                const progress = playerRef.current?.getProgress();
                const currentSeconds = Math.max(0, Math.floor(progress?.currentTime ?? 0));
                const pad = (n: number) => n.toString().padStart(2, '0');
                const hh = pad(Math.floor(currentSeconds / 3600));
                const mm = pad(Math.floor((currentSeconds % 3600) / 60));
                const ss = pad(currentSeconds % 60);
                const timeStr = `${hh}:${mm}:${ss}`;
                const text = `对于当前时间点：${timeStr}，我有以下问题：\n`;

                try {
                  const ev = new CustomEvent('ai-insert-text', { detail: { text } });
                  window.dispatchEvent(ev);
                  console.log('Dispatched ai-insert-text event:', text);
                } catch (e) {
                  console.warn('Could not dispatch ai-insert-text event', e);
                }
              }} className="w-24 h-8 p-0 bg-transparent border-0 flex items-center justify-center cursor-pointer focus:outline-none">
                <img src={questionHereImg} alt="这里不懂" className="max-w-full max-h-full" />
              </button>
            </div>
          </div>
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
