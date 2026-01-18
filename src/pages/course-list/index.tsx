import { useMemo, useState } from "react";
import { NavLink } from "react-router";

import { useAutoCache } from "@/containers/auto-cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  COURSE_CATEGORIES,
  courseServer,
  type CourseCategory,
} from "@/server/training-server";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import "./index.css";

// 格式化学时显示（单位：小时，保留两位小数）
function formatDuration(hours: number): string {
  // 如果小时数是整数，直接显示小时
  if (hours % 1 === 0) {
    return `${hours} 小时`;
  }
  
  // 否则显示带两位小数的格式
  const formatted = hours.toFixed(2);
  
  // 可选：如果小数部分有实际意义，可以转换为小时和分钟
  // 例如：1.5小时 -> 1小时30分钟
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${formatted} 小时`;
  } else if (wholeHours === 0) {
    return `${minutes} 分钟`;
  } else {
    return `${wholeHours} 小时 ${minutes} 分钟`;
  }
}

export function CourseList() {
  const { loading, error, data } = useAutoCache(courseServer.search.bind(courseServer), [{ limit: 1000, page: 1 }]);
  const [keyword, setKeyword] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<CourseCategory[]>(() => [...COURSE_CATEGORIES]);

  const courseList = data?.data ?? [];

  const filteredCourses = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return courseList
      .filter((course) => {
        if (selectedCategories.length === 0) return false; // no categories selected -> show none
        // when categories selected: keep courses whose category is in the selection
        return course.category !== undefined && course.category !== null && selectedCategories.includes(course.category as CourseCategory);
      })
      .filter((course) => {
        if (!q) return true;
        return course.name.toLowerCase().includes(q);
      });
  }, [courseList, keyword, selectedCategories]);

  if (loading) {
    return <div>loading...</div>
  }
  if (error) {
    return <div>{error.message}</div>
  }
  if (loading === false && error == null) {
    return (
      <div className="flex justify-center p-6">
        <div className="w-full max-w-[1120px] flex flex-col gap-6">
          <div className="flex flex-col items-start gap-6">
            <h1 className="course-heading text-[20px] leading-[20px] font-medium text-[#171717]">课程广场</h1>

            <div className="filter-bar flex items-center justify-between w-full">
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-2 h-4 w-4 text-gray-400" strokeWidth={2} />
                <Input
                  className="course-search-input h-[32px] w-[240px] rounded-[8px] border border-[#E4E4E7] bg-white px-3 pl-8 text-sm text-[#171717] outline-none"
                  placeholder="搜索课程"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
                {keyword && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 h-5 w-5 p-0 text-gray-400"
                    onClick={() => setKeyword("")}
                    aria-label="清除搜索"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                {COURSE_CATEGORIES.map((category: CourseCategory, idx: number) => {
                  const active = selectedCategories.includes(category);
                  const colorIndex = idx % 4; // map to chip-color-0..3
                  const chipClass = `chip-color-${colorIndex}`;
                  return (
                    <Button
                      key={category}
                      variant={active ? "outline" : "ghost"}
                      size="sm"
                      className={`category-chip ${active ? "active" : ""} ${chipClass}`}
                      onClick={() =>
                        setSelectedCategories((prev) =>
                          prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
                        )
                      }
                      aria-pressed={active}
                    >
                      {category}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {filteredCourses.length === 0 ? (
            selectedCategories.length === 0 ? (
              <div className="w-full" />
            ) : (
              <div className="w-full py-12 text-center text-gray-500">无相关课程，敬请期待</div>
            )
          ) : (
            <div className="flex flex-wrap gap-4">
              {filteredCourses.map((course) => {
                const iconSrc = course.icon_url;
                const catIndex = course.category ? COURSE_CATEGORIES.indexOf(course.category) : -1;
                const cardColorClass = catIndex >= 0 ? `card-color-${catIndex}` : "";
                return (
                  <NavLink
                    key={course.course_id}
                    to={`/app/courseList/courseDetail/${course.course_id}`}
                    className="text-inherit no-underline"
                  >
                    <Card className={`course-card flex h-[240px] w-[320px] flex-col gap-4 rounded-xl bg-white p-3 shadow-sm overflow-hidden ${cardColorClass}`}> 
                      <CardHeader className="flex flex-row items-center gap-3 p-0">
                        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[#f7f8fa] to-[#eceff3]">
                          <img
                            src={iconSrc}
                            alt={`${course.name} 图标`}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              e.currentTarget.parentElement?.classList.add("course-icon-placeholder");
                            }}
                          />
                        </div>
                        <div className="flex min-w-0 flex-col gap-1">
                          <CardTitle className="course-title truncate">{course.name}</CardTitle>
                          {/* 学时信息 */}
                          <div className="course-duration text-sm text-gray-600">
                            {course.total_estimated_time ? formatDuration(course.total_estimated_time) : "学时待定"}
                          </div>
                          {/* 讲师标签 */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {course.contributors ? (
                              (() => {
                                // 将逗号分隔的字符串分割为数组，去除空白字符
                                const contributorsArray = course.contributors
                                  .split(',')
                                  .map(item => item.trim())
                                  .filter(item => item.length > 0);
                                
                                if (contributorsArray.length === 0) {
                                  return (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors">
                                      佚名
                                    </span>
                                  );
                                }
                                
                                return (
                                  <>
                                    {contributorsArray.slice(0, 2).map((contributor, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
                                      >
                                        {contributor}
                                      </span>
                                    ))}
                                    {contributorsArray.length > 2 && (
                                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors">
                                        +{contributorsArray.length - 2}
                                      </span>
                                    )}
                                  </>
                                );
                              })()
                            ) : (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors">
                                佚名
                              </span>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <p className="course-description">
                          {course.description || "暂无课程描述"}
                        </p>
                      </CardContent>
                    </Card>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }
}
