import { handleQuiz } from "@/lib/agent";
import type { QuizRequest, QuizResponse } from "@/types/quiz";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QuizRequest;

    // Validate required fields
    if (!body.patient_id) {
      return Response.json(
        { error: "Missing required field: patient_id" },
        { status: 400 },
      );
    }

    // Call the agent with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const result = await handleQuiz(body);

      const response: QuizResponse = {
        agent: "AI-Quiz-Agent-v2",
        summary: result.summary_text,
        structured_summary: result.structured_summary,
        validation_status: result.validation_status,
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

    // Handle specific error codes with professional messages
    if (errorMessage.includes("SERVICE_QUOTA_EXCEEDED")) {
      return Response.json(
        {
          error:
            "The AI service is temporarily unavailable due to high demand. Please try again in a few moments.",
          code: "SERVICE_QUOTA_EXCEEDED",
        },
        { status: 503 },
      );
    }

    if (errorMessage.includes("SERVICE_PERMISSION_DENIED")) {
      return Response.json(
        {
          error:
            "The AI service is currently unavailable. Please contact support if this persists.",
          code: "SERVICE_PERMISSION_DENIED",
        },
        { status: 503 },
      );
    }

    if (errorMessage.includes("SERVICE_TEMPORARILY_UNAVAILABLE")) {
      return Response.json(
        {
          error:
            "The AI service is temporarily unavailable. Please try again shortly.",
          code: "SERVICE_TEMPORARILY_UNAVAILABLE",
        },
        { status: 503 },
      );
    }

    if (errorMessage.includes("abort")) {
      return Response.json(
        { error: "Quiz processing timed out. Please try again." },
        { status: 504 },
      );
    }

    return Response.json(
      { error: "An error occurred while processing your request. Please try again." },
      { status: 500 },
    );
  }
}
