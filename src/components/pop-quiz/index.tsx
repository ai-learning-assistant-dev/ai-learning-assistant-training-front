import Selection from "./selection";
import type { Option } from "./selection";
import ShortAnswer from "./short-answer";
import image from './image.png';
import { useAutoCache } from "@/containers/auto-cache";
import { exerciseServer } from "@/server/training-server";
import { useParams } from "react-router";

export function PopQuiz() {
  const params = useParams();
  const {data} = useAutoCache(exerciseServer.getExercisesWithOptionsBySection, [{section_id: params.sectionId}]);

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-gray-200 border-solid p-4">
      {
        data?.data.map((exercise) => {
          if (exercise.options && (exercise.type_status === '0' || exercise.type_status === '1')) {
            return <Selection
              key={exercise.exercise_id}
              question={exercise.question}
              options={exercise.options?.map((opt) => ({
                id: opt.option_id,
                label: opt.option_text,
                value: opt.option_text,
              }))}
              mode={exercise.type_status === '0' ? 'single' : 'multiple'}
            />
          } else if (exercise.options && exercise.type_status === '2') {
            return <ShortAnswer
              key={exercise.exercise_id}
              question={exercise.question}
            />
          }
          return null;
        })
      }
    </div>
  )
}