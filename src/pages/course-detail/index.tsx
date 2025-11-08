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
import { ArrowDown, Lock } from "lucide-react";

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
      <Table>
        <TableCaption>章节列表</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">章节名称</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {course?.chapters?.map((chapter) => (
            <Fragment key={chapter.chapter_id}>
              <TableRow key={chapter.chapter_id}>
                <TableCell className="font-medium">{chapter.title}</TableCell>
                <TableCell><ArrowDown /></TableCell>
              </TableRow>
              {
                chapter?.sections?.map((section)=>(
                  <TableRow key={section.section_id}>
                    <TableCell className="font-medium">{section.title}</TableCell>
                    <TableCell>
                      {
                        section.unlocked === 0 ? (
                          <Lock/>
                        ) : (
                          <NavLink to={`/app/courseList/courseDetail/${course.course_id}/sectionDetail/${section.section_id}`}>
                            <Button>{section.unlocked === 1 ? '学习' : '复习'}</Button>
                          </NavLink>
                        )
                      }</TableCell>
                  </TableRow>
                ))
              }
            </Fragment>
          ))}
        </TableBody>
      </Table>
    )
  }
}