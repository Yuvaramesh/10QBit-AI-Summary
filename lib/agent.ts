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

    const prompt = `You are an AI assistant specialized in summarizing patient quiz data with a focus on BMI calculations and health metrics.

IMPORTANT: When analyzing the quiz data, you must:
1. Extract weight information: previous weight and latest/current weight
2. Extract height information: previous height and current/latest height
3. Calculate BMI for both previous and current measurements using the formula: BMI = weight (kg) / (height (m))²
4. Compare the BMI values and note any significant changes
5. Provide health insights based on BMI categories:
   - Underweight: BMI < 18.5
   - Normal weight: BMI 18.5 - 24.9
   - Overweight: BMI 25 - 29.9
   - Obese: BMI ≥ 30

Respond ONLY with valid JSON in this exact format:
{
  "summary_text": "Brief summary including BMI analysis, weight changes, and health recommendations",
  "structured_summary": {
    "previous_weight": "value with unit",
    "current_weight": "value with unit",
    "weight_change": "value with unit",
    "previous_height": "value with unit",
    "current_height": "value with unit",
    "previous_bmi": "calculated value",
    "current_bmi": "calculated value",
    "bmi_change": "calculated difference",
    "previous_bmi_category": "category name",
    "current_bmi_category": "category name",
    "health_status": "assessment",
    "recommendations": ["recommendation1", "recommendation2"],
    "other_key_findings": {}
  }
}

Quiz data to analyze:
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
