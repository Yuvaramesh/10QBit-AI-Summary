import { handleQuiz } from "@/lib/agent";
import type { QuizRequest, QuizResponse } from "@/types/quiz";
import { createErrorResponse } from "@/lib/error-handler";

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

    // Handle timeout separately
    if (errorMessage.includes("abort")) {
      return Response.json(
        { error: "Quiz processing timed out. Please try again." },
        { status: 504 },
      );
    }

    // Use the centralized error handler for professional messages
    const errorResponse = createErrorResponse(error);
    const statusCode = errorResponse.code === "SERVICE_QUOTA_EXCEEDED" || 
                       errorResponse.code === "SERVICE_PERMISSION_DENIED" ||
                       errorResponse.code === "SERVICE_TEMPORARILY_UNAVAILABLE" ||
                       errorResponse.code === "SERVICE_INVALID_API_KEY"
      ? 503
      : 500;

    return Response.json(errorResponse, { status: statusCode });
  }
}
