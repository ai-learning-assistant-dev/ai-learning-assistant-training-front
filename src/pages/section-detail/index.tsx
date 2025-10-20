import { VideoPlayer } from "@/components/video-player";
import { useAutoCache } from "@/containers/auto-cache";
import { sectionsServer } from "@/server/training-server";
import { useParams } from "react-router";
import { Response } from "@/components/ui/shadcn-io/ai/response";
import { SectionHeader } from "@/components/section-header";

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
        return (
            <div className="flex flex-col gap-4 px-6">
                <SectionHeader />
                <VideoPlayer url={section.video_url} />
                <Response className="text-base leading-relaxed">{section.knowledge_content}</Response>
            </div>
        )
    }
    
}
