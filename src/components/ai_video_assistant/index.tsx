import React from 'react';
import { X, Sparkles, PlayCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { KnowledgePoints } from '@/server/training-server';

export type KnowledgePointsProps = {
  data?: KnowledgePoints;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerButton?: React.ReactNode;
};

// 辅助函数：将平铺的数据按 title 分组
const groupDataByTitle = (items: NonNullable<KnowledgePoints['key_points']>) => {
  const groups: Record<string, NonNullable<KnowledgePoints['key_points']>> = {};
  items.forEach(item => {
    if (!groups[item.title]) {
      groups[item.title] = [];
    }
    groups[item.title].push(item);
  });
  return groups;
};

export const AIVideoSummary = ({ data, className, open, onOpenChange, triggerButton }: KnowledgePointsProps) => {
  // 如果没有传入 data，使用 Mock 数据，或者处理空状态
  const points = data?.key_points;

  if (!points || points.length === 0) return null;

  const groupedPoints = groupDataByTitle(points);
  const [internalOpen, setInternalOpen] = React.useState(false);

  // 如果提供了 open 属性，则使用受控模式；否则使用内部状态
  const isOpen = open !== undefined ? open : internalOpen;
  const handleOpenChange = (newOpen: boolean) => {
    if (open === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{triggerButton || <Button variant='outline'>打开 AI 助手</Button>}</PopoverTrigger>

      <PopoverContent side='bottom' align='end' sideOffset={16} className={cn('w-[400px] p-0 overflow-hidden rounded-xl border-none shadow-2xl bg-white', className)}>
        {/* 头部区域 */}
        <div className='flex items-center justify-between p-4 pb-2'>
          <div className='flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1.5 rounded-lg shadow-md'>
            <Sparkles className='w-4 h-4' />
            <span className='text-sm font-semibold'>AI视频助手</span>
          </div>
          <Button variant='ghost' size='icon' className='h-8 w-8 text-gray-500 hover:bg-gray-200 rounded-full' onClick={() => handleOpenChange(false)}>
            <X className='w-5 h-5' />
          </Button>
        </div>

        {/* 滚动内容区域 */}
        <div className='max-h-[600px] overflow-y-auto p-4 pt-0 space-y-4 custom-scrollbar'>
          {Object.entries(groupedPoints).map(([title, items], index) => (
            <div key={index} className='bg-white border border-gray-200 rounded-2xl p-5 shadow-sm'>
              {/* 小结标题 */}
              <h3 className='text-base font-semibold text-gray-800 mb-4'>{title}</h3>

              {/* 时间点列表 */}
              <div className='space-y-4'>
                {items.map((item, idx) => (
                  <div key={idx} className='flex gap-3 items-start group cursor-pointer'>
                    {/* 时间戳胶囊 */}
                    <div className='flex-shrink-0 border border-gray-200/80 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-md min-w-[60px] text-center group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors'>
                      {item.time}
                    </div>

                    {/* 描述文本 */}
                    <p className='text-sm text-gray-600 leading-relaxed group-hover:text-gray-900 transition-colors'>{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AIVideoSummary;
