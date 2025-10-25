import Selection from "./selection";
import type { Option } from "./selection";
import ShortAnswer from "./short-answer";
import image from './image.png';
import { useAutoCache } from "@/containers/auto-cache";
import { exerciseResultServer, exerciseServer } from "@/server/training-server";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { use, useCallback } from "react";
import { z } from "zod"
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { isArray } from "lodash";



export function Examination({ onPass, onFail}: { onPass?: (data: any) => void, onFail?: (data: any) => void }) {
  const params = useParams();
  const {data} = useAutoCache(exerciseServer.getExercisesWithOptionsBySection, [{section_id: params.sectionId}]);
  const {data: exerciseResult } = useAutoCache(exerciseResultServer.getExerciseResults, [{user_id: '',section_id: params.sectionId}]);

  const schema: Record<string, z.ZodOptional<z.ZodAny>> = {

  }

  const defaultValues: Record<string, any> = {

  }

  data?.data.forEach((exercise) => {
    schema[exercise.exercise_id] = z.any().optional();
    if(exerciseResult){
      for(const item of exerciseResult?.data.exerciseResult){
        if(item.exercise_id === exercise.exercise_id){
          if(exercise.type_status === '2'){
            defaultValues[exercise.exercise_id] = item.user_answer;
          }else{
            defaultValues[exercise.exercise_id] = item.user_answer.split(';');
          }
        }
      }
    }
  })
  const formSchema = z.object(schema)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  const onSubmit = useCallback(async (values: z.infer<typeof formSchema>) =>{
    const formData = {
      user_id: '',
      section_id: params.sectionId,
      list: [] as { exercise_id: string; user_answer: string }[]
    };
    for (const key in values) {
      if (!Object.prototype.hasOwnProperty.call(values, key)) {
        continue;
      }
      formData.list.push({
        exercise_id: key,
        user_answer: isArray(values[key]) ?  values[key].join(';') : values[key],
      });
    }
    const result = await exerciseResultServer.saveExerciseResults(formData);
    if(result.data.pass){
      onPass?.(result);
    }else {
      onFail?.(result);
    }
  }, [params.sectionId, onPass, onFail]);

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-gray-200 border-solid p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {
            data?.data.map((exercise) => {
              if (exercise.type_status === '0' || exercise.type_status === '1') {
                return (
                  <FormField
                    key={exercise.exercise_id}
                    control={form.control}
                    name={exercise.exercise_id}
                    render={({ field }) => (
                      <Selection
                        {...field}
                        key={exercise.exercise_id}
                        question={exercise.question}
                        score={exercise.score}
                        image={image}
                        options={exercise.options?.map((opt) => ({
                          id: opt.option_id,
                          label: opt.option_text,
                          value: opt.option_id,
                          image: image,
                          is_correct: opt.is_correct,
                        }))}
                        mode={exercise.type_status === '0' ? 'single' : 'multiple'}
                        explanation={false}
                      />
                      )}
                  />
                )
              } else if (exercise.type_status === '2') {
                return (
                  <FormField
                    key={exercise.exercise_id}
                    control={form.control}
                    name={exercise.exercise_id}
                    render={({ field }) => (
                      <ShortAnswer
                        {...field}
                        key={exercise.exercise_id}
                        question={exercise.question}
                        answerKey={exercise.answer}
                        score={exercise.score}
                        image={image}
                        explanation={false}
                      />
                    )}
                  />
                )
              }
              return null;
            })
          }
          <Button type="submit">交卷</Button>
        </form>
      </Form>
    </div>
  )
}