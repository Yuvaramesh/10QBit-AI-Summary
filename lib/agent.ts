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

    const prompt = `You are an AI assistant specialized in creating comprehensive medical summaries from patient quiz data with focus on weight management journey, medication history, and health metrics progression.

CRITICAL INSTRUCTIONS - You MUST analyze and include ALL of the following in your summary:

1. PATIENT DEMOGRAPHICS:
   - Age, sex, ethnicity
   - How long they've been managing weight

2. WEIGHT PROGRESSION (Include ALL historical data):
   - Starting weight before first medication
   - Weight at each medication transition (Mounjaro → Saxenda → Wegovy)
   - Current weight from main quiz
   - Latest weight from order quiz
   - Calculate total weight change and percentage
   - Identify which periods had most/least weight loss

3. BMI CALCULATIONS:
   - Calculate BMI at each major weight point using height from the data
   - Formula: BMI = weight(kg) / (height(m))²
   - Show BMI progression over time
   - Categorize each BMI (Underweight <18.5, Normal 18.5-24.9, Overweight 25-29.9, Obese ≥30)

4. HEIGHT INFORMATION:
   - Extract and confirm height measurements
   - Note if height changed (which would be unusual and worth flagging)

5. GOAL TRACKING:
   - Target weight from the data
   - Progress toward goal (calculate remaining kg and percentage)

6. MEDICATION HISTORY (Complete timeline):
   - List ALL medications tried in chronological order
   - For EACH medication include:
     * Name and dosage
     * Start date and end date (or "currently taking")
     * Weight at start vs weight at end
     * Weight lost/gained during that medication
     * Duration of use
     * Side effects reported
     * Why they stopped (if applicable)

7. CURRENT MEDICATION STATUS:
   - What they're taking now or ordering
   - Current dosage
   - How they're feeling (scale rating if provided)
   - Adherence to prescription
   - Any recent side effects

8. HEALTH CONDITIONS:
   - Pre-existing conditions
   - Family history (especially diabetes)
   - Allergies
   - Other medications

9. PREVIOUS WEIGHT LOSS APPROACHES:
   - Methods tried before medications

10. ORDER HISTORY:
    - Number of orders placed
    - Current order details
    - Previous orders and their status

RESPONSE FORMAT: Provide a comprehensive narrative summary that reads naturally but includes ALL the data points above. Then provide structured data for easy parsing.

Respond ONLY with valid JSON in this exact format:
{
  "summary_text": "A comprehensive narrative summary (3-5 paragraphs) covering: patient background, complete weight journey with all measurements and dates, BMI progression analysis, detailed medication history with outcomes for each, current status and goals, health considerations, and recommendations. Include specific numbers, dates, and percentages throughout.",
  "structured_summary": {
    "patient_info": {
      "patient_id": "from data",
      "age_range": "from data",
      "sex": "from data",
      "ethnicity": "from data",
      "weight_challenge_duration": "from data"
    },
    "weight_progression": {
      "timeline": [
        {
          "date": "date or medication context",
          "weight_kg": "value",
          "bmi": "calculated",
          "bmi_category": "category",
          "context": "e.g., Before Mounjaro"
        }
      ],
      "total_weight_lost_kg": "calculated",
      "total_weight_lost_percentage": "calculated",
      "most_effective_period": "which medication period showed best results"
    },
    "height_info": {
      "current_height_cm": "value",
      "height_consistent": "yes/no"
    },
    "goals": {
      "target_weight_kg": "from data",
      "current_weight_kg": "latest value",
      "remaining_kg": "calculated",
      "progress_percentage": "calculated"
    },
    "medication_history": [
      {
        "medication": "name",
        "dosage": "value",
        "start_date": "date",
        "end_date": "date or 'current'",
        "starting_weight_kg": "value",
        "ending_weight_kg": "value",
        "weight_change_kg": "calculated",
        "duration": "time period",
        "side_effects": "reported effects",
        "currently_taking": "yes/no",
        "reason_stopped": "if applicable"
      }
    ],
    "current_status": {
      "current_medication": "name and dosage",
      "feeling_score": "1-10 rating if provided",
      "adherence": "yes always/sometimes/no",
      "recent_side_effects": "any reported",
      "side_effect_severity": "1-10 if provided"
    },
    "health_conditions": {
      "diagnosed_conditions": [],
      "family_history": [],
      "allergies": [],
      "other_medications": []
    },
    "previous_approaches": [],
    "orders": {
      "total_orders": "number",
      "current_order": {
        "order_id": "value",
        "product": "name",
        "dosage": "value",
        "plan": "duration",
        "status": "state"
      }
    },
    "recommendations": [
      "recommendation based on progress",
      "recommendation based on goals",
      "recommendation based on health status"
    ]
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
            temperature: 0.3,
            maxOutputTokens: 4096,
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
