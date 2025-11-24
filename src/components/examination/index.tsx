import Selection from "./selection";
import type { Option } from "./selection";
import ShortAnswer from "./short-answer";
import image from './image.png';
import { useAutoCache } from "@/containers/auto-cache";
import { exerciseResultServer, exerciseServer, type ExrciseResultCompose } from "@/server/training-server";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { use, useCallback, useState, useEffect, useContext } from "react";
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
import { ExaminationContext } from "@/contexts/examination-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function getSingleExerciseResult(results: ExrciseResultCompose, exercise_id: string) {
  const result = results.results.filter(item => item.exercise_id === exercise_id)[0];
  if (result) {
    return result;
  }
}

// 定义表单值的类型
type FormValues = Record<string, string | string[] | undefined>;

export function Examination({ onPass, onFail }: { onPass?: (data: any) => void, onFail?: (data: any) => void }) {
  const params = useParams();
  const [explanation, setExplanation] = useState(false);
  const [trigger, setTrigger] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [resultDialogShow, setResultDialogShow] = useState(false);
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false);
  const [incompleteCount, setIncompleteCount] = useState(0);
  const { setIsExamination } = useContext(ExaminationContext);
  
  const { data } = useAutoCache(exerciseServer.getExercisesWithOptionsBySection, [{ section_id: params.sectionId }]);
  const { data: exerciseResult } = useAutoCache(
    exerciseResultServer.getExerciseResults,
    [{ user_id: getLoginUser()?.user_id, section_id: params.sectionId }], undefined, trigger
  );

  useEffect(() => {
    setIsExamination(!explanation);
  }, [explanation, setIsExamination]);

  const checkResult = () => {
    setExplanation(true);
    setResultDialogShow(false);
  }

  const schema: Record<string, z.ZodOptional<z.ZodAny>> = {}

  const defaultValues: Record<string, any> = {}

  data?.data.forEach((exercise) => {
    schema[exercise.exercise_id] = z.any().optional();
    if (exerciseResult) {
      for (const item of exerciseResult?.data.results) {
        if (item.exercise_id === exercise.exercise_id) {
          if (exercise.type_status === '2') {
            defaultValues[exercise.exercise_id] = item.user_answer;
          } else {
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

  const submitForm = async (values: FormValues) => {
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
        user_answer: isArray(values[key]) ? (values[key] as string[]).join(';') : (values[key] as string || ''),
      });
    }
    try {
      setSubmitting(true);
      await exerciseResultServer.saveExerciseResults(formData);
      setTrigger(trigger + 1);
      setResultDialogShow(true);
    } finally {
      setSubmitting(false);
    }
  };

  const checkAllQuestionsAnswered = (values: FormValues) => {
    let count = 0;
    for (const key in values) {
      if (!Object.prototype.hasOwnProperty.call(values, key)) {
        continue;
      }
      if (!values[key] || (Array.isArray(values[key]) && (values[key] as string[]).length === 0)) {
        count++;
      }
    }
    setIncompleteCount(count);
    return count === 0;
  };

  const onSubmit = useCallback(async (values: FormValues) => {
    // 检查是否所有题目都已作答
    if (!checkAllQuestionsAnswered(values)) {
      setShowIncompleteDialog(true);
      return;
    }

    await submitForm(values);
  }, [params.sectionId, setTrigger, data]);

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
                        user_score={singleResult ? singleResult.user_score : 0}
                        ai_feedback={singleResult ? singleResult.ai_feedback : ''}
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
                        user_score={singleResult ? singleResult.user_score : 0}
                        ai_feedback={singleResult ? singleResult.ai_feedback : ''}
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
          {!explanation &&
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  AI批改中
                </span>
              ) : (
                '交卷'
              )}
            </Button>
          }
          {explanation && exerciseResult?.data.pass && <Button onClick={() => { setExplanation(false); onPass && onPass(exerciseResult) }} type="button">进入对照学习</Button>}
          {explanation && !(exerciseResult?.data.pass) && <Button onClick={() => { setExplanation(false); onFail && onFail(exerciseResult) }} type="button">返回视频学习</Button>}
        </form>
      </Form>
      {exerciseResult && <ExamResultDialog open={resultDialogShow} {...exerciseResult.data} onSubmit={checkResult} />}

      {/* 未完成题目确认弹窗 */}
      <AlertDialog open={showIncompleteDialog} onOpenChange={setShowIncompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>还有未完成的题目</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>您还有 <span className="font-semibold text-amber-600">{incompleteCount}</span> 道题目未作答。</p>
              <p className="text-sm text-muted-foreground">
                为了获得更准确的评估和反馈，建议您先完成所有题目后再提交。
              </p>
              <p className="text-sm text-muted-foreground">
                如果您坚持提交，未作答题目将计为0分。
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowIncompleteDialog(false)}>
              继续答题
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowIncompleteDialog(false);
                submitForm(form.getValues());
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              提交当前答案
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
