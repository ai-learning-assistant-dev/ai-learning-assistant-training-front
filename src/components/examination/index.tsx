import Selection from "./selection";
import type { Option } from "./selection";
import ShortAnswer from "./short-answer";
import image from './image.png';
import { useAutoCache } from "@/containers/auto-cache";
import { exerciseResultServer, exerciseServer, type ExrciseResultCompose } from "@/server/training-server";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { use, useCallback, useState } from "react";
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
import { getLoginUser } from "@/containers/auth-middleware";
import { ExamResultDialog } from "../exam-result-dialog";

function getSingleExerciseResult(results: ExrciseResultCompose, exercise_id: string){
  const result = results.results.filter(item=>item.exercise_id === exercise_id)[0];
  if(result){
    return result;
  }
}

export function Examination({ onPass, onFail}: { onPass?: (data: any) => void, onFail?: (data: any) => void }) {
  const params = useParams();
  const [explanation, setExplanation] = useState(false);
  const [trigger, setTrigger] = useState(1);
  const [resultDialogShow, setResultDialogShow] = useState(false);
  const {data} = useAutoCache(exerciseServer.getExercisesWithOptionsBySection, [{section_id: params.sectionId}]);
  const {data: exerciseResult } = useAutoCache(
    exerciseResultServer.getExerciseResults, 
    [{user_id: getLoginUser()?.user_id,section_id: params.sectionId}], undefined, trigger
  );

  const checkResult = ()=>{
    setExplanation(true);
    setResultDialogShow(false);
  }

  const schema: Record<string, z.ZodOptional<z.ZodAny>> = {

  }

  const defaultValues: Record<string, any> = {

  }

  data?.data.forEach((exercise) => {
    schema[exercise.exercise_id] = z.any().optional();
    if(exerciseResult){
      for(const item of exerciseResult?.data.results){
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
      user_id: getLoginUser().user_id,
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
    await exerciseResultServer.saveExerciseResults(formData);
    setTrigger(trigger + 1);
    setResultDialogShow(true);
  }, [params.sectionId, setTrigger]);
  

  return (
    <div className="flex">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6 rounded-xl border border-gray-200 border-solid p-4">
          {
            data?.data.map((exercise) => {
              const singleResult = exerciseResult?.data && getSingleExerciseResult(exerciseResult?.data, exercise.exercise_id)
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
                        answerKey={exercise.answer}
                        score={exercise.score}
                        user_score={singleResult?singleResult.user_score:0}
                        ai_feedback={singleResult?singleResult.ai_feedback:''}
                        image={exercise.image}
                        options={exercise.options?.map((opt) => ({
                          id: opt.option_id,
                          label: opt.option_text,
                          value: opt.option_id,
                          image: opt.image,
                          is_correct: opt.is_correct,
                        }))}
                        mode={exercise.type_status === '0' ? 'single' : 'multiple'}
                        explanation={explanation}
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
                        user_score={singleResult?singleResult.user_score:0}
                        ai_feedback={singleResult?singleResult.ai_feedback:''}
                        image={exercise.image}
                        explanation={explanation}
                      />
                    )}
                  />
                )
              }
              return null;
            })
          }
          {!explanation&&<Button type="submit">交卷</Button>}
          {explanation && exerciseResult?.data.pass && <Button onClick={()=> {setExplanation(false);onPass&&onPass(exerciseResult)}} type="button">进入对照学习</Button>}
          {explanation && !(exerciseResult?.data.pass) && <Button onClick={()=>{setExplanation(false);onFail&&onFail(exerciseResult)}} type="button">返回视频学习</Button>}
        </form>
      </Form>
      {exerciseResult&&<ExamResultDialog open={resultDialogShow} {...exerciseResult.data} onSubmit={checkResult}/>}
    </div>
  )
}