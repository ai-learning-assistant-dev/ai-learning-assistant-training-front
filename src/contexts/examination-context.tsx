import { createContext } from "react";

export const ExaminationContext = createContext<{
  isExamination: boolean;
  setIsExamination: (value: boolean) => void;
}>({
  isExamination: false,
  setIsExamination: () => {},
});
