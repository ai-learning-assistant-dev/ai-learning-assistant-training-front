import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';

interface MarkdownRendererProps {
  content: string;
}

// 代码块组件，使用 shiki 进行语法高亮
const CodeBlock = ({ language, code }: { language: string; code: string }) => {
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    const highlight = async () => {
      try {
        const highlightedCode = await codeToHtml(code, {
          lang: language || 'text',
          theme: 'github-dark',
        });
        setHtml(highlightedCode);
      } catch (error) {
        // 如果语言不支持，使用纯文本
        const fallbackCode = await codeToHtml(code, {
          lang: 'text',
          theme: 'github-dark',
        });
        setHtml(fallbackCode);
      }
    };
    highlight();
  }, [code, language]);

  if (!html) {
    return (
      <pre className="bg-[#0d1117] text-white p-4 rounded-md overflow-x-auto my-2">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div
      className="rounded-md overflow-x-auto my-2 [&>pre]:!bg-[#0d1117] [&>pre]:p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        // 代码块
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          const code = String(children).replace(/\n$/, '');
          
          return !inline && match ? (
            <CodeBlock language={match[1]} code={code} />
          ) : (
            <code
              className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
              {...props}
            >
              {children}
            </code>
          );
        },
        // 标题
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold mt-6 mb-4 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-bold mt-5 mb-3 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold mt-4 mb-2 first:mt-0">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-base font-semibold mt-3 mb-2 first:mt-0">{children}</h4>
        ),
        // 段落
        p: ({ children }) => <p className="mb-4 leading-7 last:mb-0">{children}</p>,
        // 列表
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-4 space-y-2 last:mb-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-4 space-y-2 last:mb-0">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-7">{children}</li>,
        // 引用
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary/50 pl-4 my-4 italic text-muted-foreground">
            {children}
          </blockquote>
        ),
        // 链接
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        // 表格
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full border-collapse border border-border">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted">{children}</thead>
        ),
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => (
          <tr className="border-b border-border">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2 text-left font-semibold border border-border">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2 border border-border">{children}</td>
        ),
        // 水平线
        hr: () => <hr className="my-8 border-border" />,
        // 强调
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

