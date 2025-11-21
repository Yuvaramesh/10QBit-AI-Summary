export interface HandleQuizResult {
  summary_text: string;
  structured_summary: Record<string, any>;
}

export async function handleQuiz(
  payload: Record<string, any>
): Promise<HandleQuizResult> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }

    const inputStr = JSON.stringify(payload, null, 2);

    const prompt = `You are an AI assistant specialized in summarizing patient quiz data. 
Analyze the quiz data and respond ONLY with valid JSON in this exact format:
{"summary_text": "Brief summary here", "structured_summary": {"key": "value"}}

Quiz data to summarize:
${inputStr}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Try to extract JSON from response
    try {
      const jsonStart = responseText.indexOf("{");
      const jsonEnd = responseText.lastIndexOf("}") + 1;

      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonStr = responseText.substring(jsonStart, jsonEnd);
        const result = JSON.parse(jsonStr);

        return {
          summary_text: result.summary_text || "",
          structured_summary: result.structured_summary || {},
        };
      }
    } catch (parseError) {
      console.error("[Gemini] JSON parsing failed:", parseError);
    }

    // Fallback response
    return {
      summary_text: responseText,
      structured_summary: { raw_response: responseText },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Gemini] Quiz processing error:", errorMessage);

    return {
      summary_text: `Error processing quiz: ${errorMessage}`,
      structured_summary: { error: errorMessage, status: "failed" },
    };
  }
}
