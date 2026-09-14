import { VEO_AI_Chat } from "@/components/chat/VEO_AI_Chat";

const suggestedPrompts = [
  "What actions are due next?",
  "Summarize unresolved feedback on the current tracks.",
  "Which planned actions mention release preparation?",
] as const;

export default function VeoAiPage() {
  return (
    <section className="grid gap-6" aria-labelledby="veo-ai-heading">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          Private workspace
        </p>
        <h1
          id="veo-ai-heading"
          className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          VEO AI
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
          Ask about VEO actions and timestamped track comments. Answers cite the
          records used.
        </p>
      </header>
      <VEO_AI_Chat suggestedPrompts={suggestedPrompts} />
    </section>
  );
}
