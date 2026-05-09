import type { CSCPModule, Question } from "@/data/types";

export function calculateScore(selectedAnswers: number[], correctAnswers: number[] = selectedAnswers) {
  if (correctAnswers.length === 0) {
    return 0;
  }

  const matches = selectedAnswers.reduce((total, answer, index) => {
    return total + Number(answer === correctAnswers[index]);
  }, 0);

  return Math.round((matches / correctAnswers.length) * 100);
}

export function getCompletionRate(moduleList: CSCPModule[]) {
  if (moduleList.length === 0) {
    return 0;
  }

  const totalProgress = moduleList.reduce((sum, module) => sum + module.progress, 0);
  return Math.round(totalProgress / moduleList.length);
}

export function getModuleById(moduleList: CSCPModule[], moduleId: string) {
  const module = moduleList.find((item) => item.id === moduleId);

  if (!module) {
    throw new Error(`Module not found: ${moduleId}`);
  }

  return module;
}

export function getQuestionById(questionList: Question[], questionId: string) {
  const question = questionList.find((item) => item.id === questionId);

  if (!question) {
    throw new Error(`Question not found: ${questionId}`);
  }

  return question;
}

export function getWeakestModule(moduleList: CSCPModule[], preferredModuleId?: string) {
  if (preferredModuleId) {
    return getModuleById(moduleList, preferredModuleId);
  }

  return moduleList.reduce((weakest, module) => (module.accuracy < weakest.accuracy ? module : weakest), moduleList[0]);
}