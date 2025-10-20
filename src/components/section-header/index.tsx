import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { useAutoCache } from "@/containers/auto-cache";
import { chapterServer, courseServer, sectionsServer } from "@/server/training-server";
import { Clock, PlugZap } from "lucide-react";
import { useParams } from "react-router"

export function SectionHeader() {
  const params = useParams();
  const sectionId = params.sectionId;
  const courseId = params.courseId;
  const { data: course } = useAutoCache(courseServer.getById, [{course_id: courseId}]);
  const { data: section } = useAutoCache(sectionsServer.getById, [{section_id: sectionId}]);
  const { data: chapter } = useAutoCache(chapterServer.getById, [{chapter_id: section?.data.chapter_id}]);
  return (
    <Item variant='outline'>
      <ItemMedia >
        <PlugZap />
        {course?.data?.name}
      </ItemMedia>
      <ItemContent className="flex-row justify-center">
        <ItemTitle>{chapter?.data?.title ? `${chapter?.data?.title}` : ''}{section?.data?.title ? ` - ${section?.data?.title}` : ''}</ItemTitle>
      </ItemContent>
      <ItemActions>
        <Clock />{section?.data?.estimated_time}
      </ItemActions>
    </Item>
  )


}