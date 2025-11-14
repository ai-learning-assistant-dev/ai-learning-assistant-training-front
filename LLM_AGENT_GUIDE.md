# AI 学习助手开发规范

## 项目概述

**项目名称**: ai-learning-assistant-training-front  
**项目类型**: React 19+ TypeScript 前端应用  
**包管理**: pnpm  
**构建工具**: Vite 7+  
**部署环境**: 现代浏览器，支持 ESM 模块

---

## 一、技术栈规范

### UI 组件库

- **shadcn/ui + Radix UI**: 无头 UI 组件库
  - 所有交互组件从 `src/components/ui/` 导入
  - 禁止直接使用原生 HTML 表单元素
  - 所有 UI 组件需使用 Tailwind CSS 定制样式

### 样式系统

- **Tailwind CSS**: 4.1.13 - 工具类 CSS 框架
  - 优先使用 Tailwind 工具类而非自定义 CSS
  - 使用 `clsx` 或 `tailwind-merge` 进行动态类名处理

### 表单管理

- **React Hook Form**: 7.65.0 - 轻量级表单状态管理
- **Zod**: 4.1.12 - TypeScript 优先的 schema 验证库
- **@hookform/resolvers**: 5.2.2 - Hook Form 的 schema 适配器

### AI 相关

- **Vercel AI SDK**: 5.0.59 - AI 模型集成和流式响应处理
  - 所有 AI 交互必须通过 SDK 进行
  - 流式响应使用 `StreamableValue` 处理

### 工具库

- **ts-pattern**: 5.9.0 - 模式匹配和类型安全的分支处理
- **emittery**: 1.2.0 - 事件发射器，用于组件间通信
- **use-stick-to-bottom**: 1.1.1 - 消息列表粘性滚动
- **lodash**: 4.17.21 - 工具函数库（devDependencies）
- **nanoid**: 5.1.6 - 生成短随机 ID

### 内容渲染

- **react-markdown**: 10.1.0 - Markdown 渲染
- **remark-gfm**: 4.0.1 - GitHub Flavored Markdown 支持
- **remark-math**: 6.0.0 - LaTeX 数学公式支持
- **rehype-katex**: 7.0.1 - KaTeX 数学渲染
- **katex**: 0.16.22 - 快速数学公式排版
- **react-syntax-highlighter**: 15.6.6 - 代码高亮
- **shiki**: 3.13.0 - 现代代码高亮引擎
- **harden-react-markdown**: 1.1.2 - Markdown 安全加固

### HTTP 通信

- **axios**: 1.12.2 - HTTP 客户端
- **hook-fetch**: 2.2.4 - 基于原生 fetch API 的现代化 HTTP 请求库（SSE 插件）

---

## 二、样式规范

### 1. Tailwind CSS 优先

```typescript
// ✅ 好的实践
<div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
  <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
    操作
  </button>
</div>

// ❌ 避免
<div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem' }}>
  <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{title}</h3>
</div>
```

### 2. 动态样式使用 clsx/tailwind-merge

```typescript
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface ButtonProps {
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export function Button({
  variant = "primary",
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = "px-4 py-2 rounded-md font-medium transition-colors";
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
  };
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";

  const className = twMerge(
    clsx(baseClasses, variantClasses[variant], disabledClasses)
  );

  return <button className={className} disabled={disabled} {...props} />;
}
```

### 3. 组件特定样式

```
components/
├── course-card/
│   ├── index.tsx
│   └── index.css    # 仅包含组件特定样式
```

```css
/* components/course-card/index.css */
.course-card {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 三、开发工作流

### 1. 启动开发服务器

```bash
pnpm dev
```

### 2. 构建生产版本

```bash
pnpm build
```

### 3. 预览构建结果

```bash
pnpm preview
```

## 参考资源

- [React 官方文档](https://react.dev)
- [TypeScript 官方文档](https://www.typescriptlang.org)
- [Tailwind CSS 文档](https://tailwindcss.com)
- [Vercel AI SDK 文档](https://sdk.vercel.ai)
- [shadcn/ui 文档](https://ui.shadcn.com)
- [Zod 文档](https://zod.dev)
- [React Hook Form 文档](https://react-hook-form.com)

---

**最后更新**: 2025 年 11 月 14 日  
**维护人**: AI Learning Assistant Team
