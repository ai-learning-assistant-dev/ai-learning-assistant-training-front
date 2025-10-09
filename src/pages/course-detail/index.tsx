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
import { NavLink } from "react-router";

export function CourseDetail() {
  const { loading, error, data } = useAutoCache(sectionsServer.search.bind(sectionsServer), [{ limit: 10, page: 1 }]);
  if (loading) {
    return <div>loading...</div>
  }
  if (error) {
    return <div>{error.message}</div>
  }
  if (loading === false && error == null) {
    const sections = data.data;
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
          {sections.map((section) => (
            <TableRow key={section.section_id}>
              <TableCell className="font-medium">{section.title}</TableCell>
              <TableCell><NavLink to={`/app/sectionDetail/${section.section_id}`}><Button>学习</Button></NavLink></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }
}