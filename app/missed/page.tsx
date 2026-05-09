import MissedQuestionsReview from "@/components/MissedQuestionsReview";
import { missedQuestions } from "@/data/mockProgress";
import { modules } from "@/data/modules";
import { questions } from "@/data/questions";

export default function MissedPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="app-eyebrow">Missed Questions</p>
        <h1 className="app-page-title mt-3 tracking-tight">Targeted review queue</h1>
        <p className="app-body-copy mt-3 max-w-3xl text-base">
          Track every miss locally, sort the queue by recovery priority, then push the visible set straight into Weak Area mode.
        </p>
      </section>

      <MissedQuestionsReview modules={modules} questions={questions} initialMissedQuestions={missedQuestions} />
    </div>
  );
}