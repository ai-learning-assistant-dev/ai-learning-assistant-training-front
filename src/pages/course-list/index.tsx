import { useAutoCache } from "@/containers/auto-cache";
import { courseServer } from "@/server/training-server";
import { Button } from "@/components/ui/button";
import { NavLink } from "react-router";
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemHeader, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Book } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from "@/components/ui/card";
import "./index.css"
import { Image } from "@/components/ui/shadcn-io/ai/image";

export function CourseList() {
  const { loading, error, data } = useAutoCache(courseServer.search.bind(courseServer), [{ limit: 1000, page: 1 }]);
  if (loading) {
    return <div>loading...</div>
  }
  if (error) {
    return <div>{error.message}</div>
  }
  if (loading === false && error == null) {
    const courseList = data.data;
    return (
      <div className="flex gap-4 p-4 flex-wrap">
        {courseList.map((course) => (
          <NavLink key={course.course_id} to={`/app/courseList/courseDetail/${course.course_id}`}>
            <Card className="w-[320px] h-[159px] course-card">
              <CardHeader>
                <CardTitle><Book className="inline"/>{course.name}<span className="time"></span></CardTitle>
              </CardHeader>
              <CardContent className="content">
                {course.description}
              </CardContent>
            </Card>
          </NavLink>
          ))}
        

      </div>
    )
  }
}