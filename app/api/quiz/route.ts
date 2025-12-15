import { handleQuiz } from "@/lib/agent";
import type { QuizRequest, QuizResponse } from "@/types/quiz";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QuizRequest;

    // Validate required fields
    if (!body.patient_id) {
      return Response.json(
        { error: "Missing required field: patient_id" },
        { status: 400 }
      );
    }

    if (!body.session_answers) {
      return Response.json(
        { error: "Missing required field: session_answers" },
        { status: 400 }
      );
    }

    // Prepare the payload for the agent
    // If session_answers is already an object with the full structure, use it directly
    // Otherwise, wrap it in the expected format
    let payload = body.session_answers;

    // If session_answers doesn't have the expected structure, wrap it
    if (
      typeof payload === "object" &&
      !payload.main_quiz &&
      !payload.order_quiz
    ) {
      payload = {
        patient_id: body.patient_id,
        ...payload,
      };
    } else if (typeof payload === "object") {
      // It already has the structure, just ensure patient_id matches
      payload.patient_id = body.patient_id;
    }

    // Call the agent with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const result = await handleQuiz(payload);

      const response: QuizResponse = {
        agent: "AI-Medical-Summary-Agent-v2",
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
        { error: "Quiz processing timed out after 30 seconds" },
        { status: 504 }
      );
    }

    console.error("[API] Error processing quiz:", errorMessage);

    return Response.json(
      {
        error: errorMessage,
        details: "Failed to process medical quiz data",
      },
      { status: 500 }
    );
  }
}
