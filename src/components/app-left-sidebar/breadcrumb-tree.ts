// 面包屑树结构配置
// 用户可以自由修改这个树结构来决定面包屑展示的层级

export interface BreadcrumbNode {
  id: string;
  title: string;
  path: string;
  children?: BreadcrumbNode[];
}

// 面包屑树配置 - 用户可以自由修改这个结构
export const breadcrumbTree: BreadcrumbNode[] = [
  {
    id: '首页',
    title: '首页',
    path: '/app',
    children: [
      {
        id: '课程广场',
        title: '课程广场',
        path: '/app/courseList',
        children: [
          {
            id: '课程详情',
            title: '课程详情',
            path: '/app/courseList/courseDetail/:courseId',
            children: [
              {
                id: '课堂空间',
                title: '课堂空间',
                path: '/app/courseList/courseDetail/:courseId/sectionDetail/:sectionId'
              }
            ]
          }
        ]
      }
    ]
  }
];

// 根据当前路径查找面包屑路径
export function findBreadcrumbPath(currentPath: string, tree: BreadcrumbNode[] = breadcrumbTree): BreadcrumbNode[] {
  const result: BreadcrumbNode[] = [];
  
  function search(node: BreadcrumbNode, path: BreadcrumbNode[] = []): boolean {
    const currentPathWithNode = [...path, node];
    
    // 检查当前节点是否匹配
    if (node.path === currentPath) {
      result.push(...currentPathWithNode);
      return true;
    }
    
    // 检查参数化路径是否匹配
    if (node.path.includes(':') && currentPath.includes('/')) {
      const nodePathSegments = node.path.split('/');
      const currentPathSegments = currentPath.split('/');
      
      if (nodePathSegments.length === currentPathSegments.length) {
        let matches = true;
        for (let i = 0; i < nodePathSegments.length; i++) {
          if (nodePathSegments[i].startsWith(':')) continue;
          if (nodePathSegments[i] !== currentPathSegments[i]) {
            matches = false;
            break;
          }
        }
        if (matches) {
          result.push(...currentPathWithNode);
          return true;
        }
      }
    }
    
    // 递归搜索子节点
    if (node.children) {
      for (const child of node.children) {
        if (search(child, currentPathWithNode)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  for (const node of tree) {
    if (search(node)) {
      break;
    }
  }
  
  return result;
}

// 获取面包屑显示文本（处理参数化路径）
export function getBreadcrumbDisplayText(node: BreadcrumbNode, currentPath: string): string {
  if (!node.path.includes(':')) {
    return node.title;
  }
  
  // 对于参数化路径，可以在这里添加逻辑来获取实际数据
  // 例如：从路由参数获取课程名称或章节名称
  return node.title;
}
