import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import './index.css'
import App from './pages/app/index.tsx'
import { SectionDetail } from './pages/section-detail/index.tsx';
import { CourseList } from './pages/course-list/index.tsx';
import { CourseDetail } from './pages/course-detail/index.tsx';

const router = createBrowserRouter([
  {
    path: "/app",
    Component: App,
    children: [
      {
        path: "courseList",
        index: true,
        Component: CourseList,
      },
      {
        path: "courseList/courseDetail/:courseId",
        Component: CourseDetail,
      },
      {
        path: "courseList/courseDetail/:courseId/sectionDetail/:sectionId",
        Component: SectionDetail,
      }
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
