import { QuizForm } from "@/components/quiz-form";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/20">
      <div className="w-full max-w-2xl space-y-2 mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Quiz Summary Agent
        </h1>
        <p className="text-lg text-foreground/60">
          Intelligent quiz data processing powered by AI
        </p>
      </div>
      <QuizForm />
    </main>
  );
}
