import Selection from "./selection";
import type { Option } from "./selection";
import ShortAnswer from "./short-answer";
import image from './image.png';
const options: Option[] = [
  { id: "a", label: "选项 A", value: '选项 A', image: image, imageAlt: "这是第一个选项。" },
  { id: "b", label: "选项 B", value: '选项 B', image: image, imageAlt: "这是第二个选项。" },
  { id: "c", label: "选项 C", value: '选项 C', image: image, imageAlt: "这是第三个选项。" },
  { id: "d", label: "选项 D", value: '选项 D', image: image, imageAlt: "这是第四个选项。" },
];

export function PopQuiz() {
  return (
    <div className="flex flex-col gap-6">
      <Selection question="请选择" image={image} options={options} />
      <Selection question="请选择" image={image} options={options} mode='multiple'/>
      <ShortAnswer question="请简要描述一下你对本节内容的理解。" image={image} />
    </div>
  )
}