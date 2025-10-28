import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, createContext, redirect, RouterContextProvider } from "react-router";
import { RouterProvider } from "react-router/dom";
import './index.css'
import App from './pages/app/index.tsx'
import { SectionDetail } from './pages/section-detail/index.tsx';
import { CourseList } from './pages/course-list/index.tsx';
import { CourseDetail } from './pages/course-detail/index.tsx';
import UserList from './pages/user-list/index.tsx';
import { authMiddleware } from './containers/auth-middleware/index.tsx';

const router = createBrowserRouter([
  {
    path: "/",
    children: [
      {
        path: "/userList",
        index: true,
        Component: UserList,
      },
      {
        path: "/app",
        Component: App,
        middleware: [authMiddleware],
        children: [
          {
            path: "courseList",
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
    ],
  }
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)