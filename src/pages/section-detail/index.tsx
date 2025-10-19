import { VideoPlayer } from "@/components/video-player";
import { useAutoCache } from "@/containers/auto-cache";
import { sectionsServer } from "@/server/training-server";
import { useParams } from "react-router";

export function SectionDetail(){
    let params = useParams();
    const {loading, error, data} = useAutoCache(sectionsServer.getById.bind(sectionsServer), [{section_id: params.id}]);
    if(loading){
        return <div>loading...</div>
    }
    if(error){
        return <div>{error.message}</div>
    }
    if(loading === false && error == null){
        const section = data.data.data;
        return (
            <div>
                <h2>{section.title}</h2>
                <h3>{section.video_subtitles}</h3>
                <VideoPlayer url={section.video_url} />
                <p>{section.knowledge_content}</p>
            </div>
        )
    }
    
}
