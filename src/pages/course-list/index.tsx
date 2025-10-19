import { useAutoCache } from "@/containers/auto-cache";
import { courseServer } from "@/server/training-server";
import { Button } from "@/components/ui/button";
import { NavLink } from "react-router";
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemHeader, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Book } from "lucide-react";

export function CourseList() {
  const { loading, error, data } = useAutoCache(courseServer.search.bind(courseServer), [{ limit: 10, page: 1 }]);
  if (loading) {
    return <div>loading...</div>
  }
  if (error) {
    return <div>{error.message}</div>
  }
  if (loading === false && error == null) {
    const courseList = data.data;
    return (
      <div className="flex">
        {courseList.map((course) => (
          <Item key={course.course_id} variant="outline">
            <ItemMedia><Book /></ItemMedia>
            <ItemContent>
              <ItemTitle>{course.name}</ItemTitle>
              <ItemDescription>{course.description}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <NavLink to={`/app/courseList/courseDetail/${course.course_id}`}><Button>学习</Button></NavLink>
            </ItemActions>
          </Item>
          ))}
        

      </div>
    )
  }
}