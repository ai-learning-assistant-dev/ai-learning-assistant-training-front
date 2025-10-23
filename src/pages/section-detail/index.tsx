import { VideoPlayer } from "@/components/video-player";
import { useAutoCache } from "@/containers/auto-cache";
import { sectionsServer } from "@/server/training-server";
import { useParams } from "react-router";
import { Response } from "@/components/ui/shadcn-io/ai/response";
import { SectionHeader } from "@/components/section-header";
import { SectionStage } from "@/components/section-stage";
import { PopQuiz } from "@/components/pop-quiz";
import type { Stage } from "@/components/section-stage";

export function SectionDetail(){
    let params = useParams();
    const {loading, error, data} = useAutoCache(sectionsServer.getById.bind(sectionsServer), [{section_id: params.sectionId}]);
    if(loading){
        return <div>loading...</div>
    }
    if(error){
        return <div>{error.message}</div>
    }
    if(loading === false && error == null){
        const section = data.data;

        const stage: Stage = 'compare'
        return (
            <div className="flex flex-col gap-4 px-6">
                <SectionHeader />
                <SectionStage stage={stage} />
                <VideoPlayer url={section.video_url} />
                <Response className="text-base leading-relaxed">{section.knowledge_content}</Response>
                <PopQuiz />
            </div>
        )
    }
    
}
