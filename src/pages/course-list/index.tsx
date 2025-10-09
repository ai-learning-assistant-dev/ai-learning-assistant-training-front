import { useAutoCache } from "@/containers/auto-cache";
import { courseServer } from "@/server/training-server";
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
import { NavLink } from "react-router";

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
      <Table>
        <TableCaption>课程列表</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">课程名称</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courseList.map((course) => (
            <TableRow key={course.course_id}>
              <TableCell className="font-medium">{course.name}</TableCell>
              <TableCell><NavLink to={`/app/courseDetail/${course.course_id}`}><Button>学习</Button></NavLink></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }
}