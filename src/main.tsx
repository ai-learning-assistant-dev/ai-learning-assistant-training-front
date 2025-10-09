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
        Component: CourseList,
      },
      {
        path: "courseDetail/:id",
        Component: CourseDetail,
      },
      {
        path: "sectionDetail/:id",
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
