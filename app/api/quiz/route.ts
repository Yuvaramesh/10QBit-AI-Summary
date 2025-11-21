import { handleQuiz } from "@/lib/agent";
import type { QuizRequest, QuizResponse } from "@/types/quiz";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QuizRequest;

    // Validate required fields
    if (!body.patient_id || !body.quiz_id) {
      return Response.json(
        { error: "Missing required fields: patient_id or quiz_id" },
        { status: 400 }
      );
    }

    // Call the agent with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

    try {
      const result = await handleQuiz(body);

      const response: QuizResponse = {
        agent: "AI-Quiz-Agent-v1",
        summary: result.summary_text,
        structured_summary: result.structured_summary,
        timestamp: new Date().toISOString(),
      };

      clearTimeout(timeoutId);
      return Response.json(response, { status: 200 });
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("abort")) {
      return Response.json(
        { error: "Quiz processing timed out" },
        { status: 504 }
      );
    }

    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
