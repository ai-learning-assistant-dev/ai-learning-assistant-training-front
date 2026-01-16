'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkle } from 'lucide-react';
import { addCitation } from '@/components/ai-conversation';
import { cn } from '@/lib/utils';

interface PopoverPosition {
  x: number;
  y: number;
}

interface TextSelectionPopoverProps {
  /** 限定监听选中事件的容器，如果不传则监听整个 document */
  containerRef?: React.RefObject<HTMLElement | null>;
  /** 自定义提示文本 */
  tooltip?: string;
  /** 自定义按钮点击后的回调，如果不传则默认使用 addCitation */
  onSendText?: (text: string, sourcePosition?: string) => void;
}

export function TextSelectionPopover({
  containerRef,
  tooltip = '问问AI',
  onSendText,
}: TextSelectionPopoverProps) {
  const [selectedText, setSelectedText] = useState('');
  const [sourcePosition, setSourcePosition] = useState<string | undefined>();
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>({ x: 0, y: 0 });
  const [showAbove, setShowAbove] = useState(true);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isMouseDownInsidePopover = useRef(false);

  // 内联元素列表（这些元素不应该被视为独立的段落）
  const inlineElements = new Set(['SPAN', 'STRONG', 'EM', 'A', 'CODE', 'B', 'I', 'U', 'S', 'SUB', 'SUP', 'MARK']);

  // 从指定节点向上查找带有 data-source-position 的块级段落元素
  const findParagraphFromNode = useCallback((node: Node | null): HTMLElement | null => {
    // 如果是文本节点，从其父元素开始
    if (node?.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }
    
    // 向上遍历找到带有 data-source-position 的块级元素
    while (node && node !== document.body) {
      if (node instanceof HTMLElement && node.dataset.sourcePosition) {
        // 跳过内联元素，继续向上查找块级元素
        if (!inlineElements.has(node.tagName)) {
          return node;
        }
      }
      node = node.parentNode;
    }
    return null;
  }, []);

  // 获取选区起始和结束位置的段落元素
  const getSelectionParagraphs = useCallback((selection: Selection): { start: HTMLElement | null; end: HTMLElement | null } => {
    if (!selection.rangeCount) return { start: null, end: null };
    
    const range = selection.getRangeAt(0);
    const startParagraph = findParagraphFromNode(range.startContainer);
    const endParagraph = findParagraphFromNode(range.endContainer);
    
    return { start: startParagraph, end: endParagraph };
  }, [findParagraphFromNode]);

  // 获取选中文本所在的段落位置信息（使用起始段落）
  const getSourcePositionFromSelection = useCallback((selection: Selection): string | undefined => {
    const { start } = getSelectionParagraphs(selection);
    return start?.dataset.sourcePosition;
  }, [getSelectionParagraphs]);

  // 获取完整段落文本（支持跨段落选取）
  const getFullParagraphText = useCallback((selection: Selection): string => {
    if (!selection.rangeCount) return '';
    
    const range = selection.getRangeAt(0);
    const { start, end } = getSelectionParagraphs(selection);
    
    if (!start) {
      // 如果没有找到段落元素，返回原始选中文本
      return selection.toString().trim();
    }
    
    // 如果起始和结束是同一个段落，或者结束段落不存在
    if (!end || start === end) {
      return (start.textContent || '').trim();
    }
    
    // 跨段落选取：使用 Range.intersectsNode 来判断哪些段落在选区范围内
    // 找到容器元素（向上找到包含 start 和 end 的最近公共容器）
    let container: HTMLElement | null = start.parentElement;
    while (container && !container.contains(end)) {
      container = container.parentElement;
    }
    
    if (!container) {
      // fallback: 只返回起始段落
      return start.textContent?.trim() || '';
    }
    
    // 收集容器内所有带 data-source-position 且与选区相交的元素
    const allParagraphs = container.querySelectorAll('[data-source-position]');
    const paragraphs: string[] = [];
    
    for (const el of allParagraphs) {
      // 检查元素是否与选区范围相交
      if (range.intersectsNode(el)) {
        // 跳过内联元素
        if (inlineElements.has(el.tagName)) {
          continue;
        }
        
        // 检查是否是"叶子"元素（没有子元素带 data-source-position，且不是内联元素）
        // 避免父子元素都有 data-source-position 导致内容重复
        const hasChildWithPosition = el.querySelector('[data-source-position]:not(span):not(strong):not(em):not(a):not(code):not(b):not(i):not(u):not(s):not(sub):not(sup):not(mark)');
        if (hasChildWithPosition) {
          // 跳过父级容器，只保留最内层的块级元素
          continue;
        }
        
        const text = el.textContent?.trim();
        if (text) {
          paragraphs.push(text);
        }
      }
    }
    
    return paragraphs.join('\n\n');
  }, [getSelectionParagraphs]);

  // 检查选中是否在指定容器内
  const isSelectionInContainer = useCallback((selection: Selection): boolean => {
    if (!containerRef?.current) return true;
    
    const range = selection.getRangeAt(0);
    const container = containerRef.current;
    
    return container.contains(range.commonAncestorContainer);
  }, [containerRef]);

  // 处理文本选中
  const handleSelectionChange = useCallback(() => {
    // 如果鼠标在 popover 内部按下，不处理选中变化
    if (isMouseDownInsidePopover.current) return;

    const selection = window.getSelection();
    
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setIsVisible(false);
      setSelectedText('');
      setSourcePosition(undefined);
      return;
    }

    const text = selection.toString().trim();
    
    if (!text || !isSelectionInContainer(selection)) {
      setIsVisible(false);
      setSelectedText('');
      setSourcePosition(undefined);
      return;
    }

    // 获取完整段落文本（用于发送到AI，但不修改用户的选区）
    const fullParagraphText = getFullParagraphText(selection);
    
    if (!fullParagraphText) {
      setIsVisible(false);
      setSelectedText('');
      setSourcePosition(undefined);
      return;
    }

    // 获取用户当前选中区域的位置（不是扩选后的）
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // 计算弹出按钮的位置
    const x = rect.left + rect.width / 2;
    // 默认在选中区域上方，如果空间不够则显示在下方
    const spaceAbove = rect.top;
    const popoverHeight = 50; // 预估弹窗高度
    const y = spaceAbove > popoverHeight ? rect.top - 10 : rect.bottom + 10;
    const showAbove = spaceAbove > popoverHeight;
    
    setSelectedText(fullParagraphText);
    setSourcePosition(getSourcePositionFromSelection(selection));
    setPosition({ x, y });
    setShowAbove(showAbove);
    setIsVisible(true);
  }, [isSelectionInContainer, getSourcePositionFromSelection, getFullParagraphText]);

  // 处理按钮点击
  const handleButtonClick = useCallback(() => {
    if (!selectedText) return;
    
    if (onSendText) {
      onSendText(selectedText, sourcePosition);
    } else {
      addCitation(selectedText, sourcePosition);
    }
    
    // 清除选中状态
    window.getSelection()?.removeAllRanges();
    setIsVisible(false);
    setSelectedText('');
    setSourcePosition(undefined);
  }, [selectedText, sourcePosition, onSendText]);

  // 处理点击外部关闭
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
      setIsVisible(false);
    }
  }, []);

  // 处理 popover 内的 mousedown
  const handlePopoverMouseDown = useCallback(() => {
    isMouseDownInsidePopover.current = true;
  }, []);

  // 处理全局 mouseup，重置标记
  const handleGlobalMouseUp = useCallback(() => {
    // 延迟重置，确保 selectionchange 事件已处理
    setTimeout(() => {
      isMouseDownInsidePopover.current = false;
    }, 0);
  }, []);

  useEffect(() => {
    // 使用 mouseup 事件来检测选中完成
    const handleMouseUp = () => {
      // 延迟执行以确保选中已更新
      setTimeout(handleSelectionChange, 10);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    // 键盘选中（Shift + 方向键）
    document.addEventListener('keyup', handleSelectionChange);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('keyup', handleSelectionChange);
    };
  }, [handleSelectionChange, handleClickOutside, handleGlobalMouseUp]);

  if (!isVisible || !selectedText) {
    return null;
  }

  return (
    <div
      ref={popoverRef}
      className={cn(
        'fixed z-50 animate-in fade-in-0 zoom-in-95',
        'bg-background border border-border rounded-lg shadow-lg',
        'p-1'
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: showAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      }}
      onMouseDown={handlePopoverMouseDown}
    >
      <Button
        size="sm"
        variant="ghost"
        className="flex items-center gap-1.5 text-sm h-8 px-3"
        onClick={handleButtonClick}
        title={tooltip}
      >
        <Sparkle className="w-4 h-4" />
        <span>{tooltip}</span>
      </Button>
      {/* 小三角箭头指向选中区域 */}
      <div
        className={cn(
          'absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-background border-border rotate-45',
          showAbove ? '-bottom-1.5 border-r border-b' : '-top-1.5 border-l border-t'
        )}
      />
    </div>
  );
}
