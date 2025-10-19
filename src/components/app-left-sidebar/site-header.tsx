import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { useLocation, useParams, type Params } from "react-router"
import { findBreadcrumbPath, getBreadcrumbDisplayText } from "@/components/app-left-sidebar/breadcrumb-tree"

function replaceParamInPath(path: string, params: Readonly<Params<string>>): string {
  let replacedPath = path;
  for (const [key, value] of Object.entries(params)) {
    const replacement = value ?? "";
    replacedPath = replacedPath.replace(`:${key}`, replacement);
  }
  return replacedPath;
}

export function SiteHeader() {
  const params = useParams();
  const location = useLocation();
  const currentPath = location.pathname;
  const breadcrumbPath = findBreadcrumbPath(currentPath);
  
  
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbPath.map((node, index) => {
              const isLast = index === breadcrumbPath.length - 1;
              const displayText = getBreadcrumbDisplayText(node, currentPath);
              
              return (
                <BreadcrumbItem key={node.id}>
                  {isLast ? (
                    <BreadcrumbPage>{displayText}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={replaceParamInPath(node.path, params)}>
                      {displayText}
                    </BreadcrumbLink>
                  )}
                  {!isLast && index < breadcrumbPath.length - 1 && (
                    <BreadcrumbSeparator/>
                  )}
                </BreadcrumbItem>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
