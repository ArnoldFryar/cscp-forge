import QuizInterface from "@/components/QuizInterface";
import { missedQuestions, quizResults, topicPerformance, userProgress } from "@/data/mockProgress";
import { modules } from "@/data/modules";
import { questions } from "@/data/questions";
import { buildInitialProgressSnapshot } from "@/lib/progressStore";

const initialProgress = buildInitialProgressSnapshot({
  modules,
  questions,
  userProgress,
  quizResults,
  topicPerformance,
  missedQuestions,
});

export default function QuizPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="app-eyebrow">Practice Quiz</p>
        <h1 className="app-page-title mt-3 tracking-tight">Exam-prep practice studio</h1>
        <p className="app-body-copy mt-3 max-w-3xl text-base">
          Build targeted study sets, switch into delayed-feedback exam mode, or attack weak areas from missed questions and topic performance.
        </p>
      </section>
      <QuizInterface
        modules={modules}
        questions={questions}
        missedQuestions={missedQuestions}
        topicPerformance={topicPerformance}
        initialProgress={initialProgress}
      />
    </div>
  );
}