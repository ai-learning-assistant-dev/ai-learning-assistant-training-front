import { Fragment } from "react"
import { useAutoCache } from "@/containers/auto-cache";
import { chapterServer, courseServer, sectionsServer } from "@/server/training-server";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button";
import { NavLink, useParams } from "react-router";
import { ArrowDown, CirclePlay, Clock, Lock, Play } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const unlockState = ['待完成', '待完成', '已完成'];

export function CourseDetail() {
  let params = useParams();
  const { loading, error, data } = useAutoCache(courseServer.getCourseChaptersSections.bind(sectionsServer),[{course_id: params?.courseId}]);
  if (loading) {
    return <div>loading...</div>
  }
  if (error) {
    return <div>{error.message}</div>
  }
  if (loading === false && error == null) {
    const course = data.data;
    return (
      <div className="flex p-[24px] w-full">
        <Tabs defaultValue="sectionList" className="w-full">
          <TabsList>
            <TabsTrigger value="sectionList">课程大纲</TabsTrigger>
          </TabsList>
          <TabsContent value="sectionList" className="w-full">
            <Table className="w-full">
              <TableBody>
                {course?.chapters?.map((chapter) => (
                  <Fragment key={chapter.chapter_id}>
                    <TableRow key={chapter.chapter_id}>
                      <TableCell className="font-medium">{chapter.title}</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    {
                      chapter?.sections?.map((section)=>(
                        <TableRow key={section.section_id}>
                          <TableCell className="font-medium">{section.title}<Badge variant="secondary" className="text-gray-400 m-2">{section.unlocked && unlockState[section.unlocked]}</Badge></TableCell>
                          <TableCell>
                            {
                              section.unlocked !== 0 && (
                                <NavLink to={`/app/courseList/courseDetail/${course.course_id}/sectionDetail/${section.section_id}`}>
                                  <Button className={section.unlocked === 1 ? "bg-blue-600" : "bg-gray-500"}><CirclePlay/>{section.unlocked === 1 ? '从这开始' : '复习'}</Button>
                                </NavLink>
                              )
                            }</TableCell>
                            <TableCell className="font-medium text-right"><Clock className="text-gray-400 m-2 inline"/>{section.estimated_time}</TableCell>
                        </TableRow>
                      ))
                    }
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
        
      </div>
    )
  }
}