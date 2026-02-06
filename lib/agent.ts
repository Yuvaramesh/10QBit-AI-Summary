export interface HandleQuizResult {
  summary_text: string;
  structured_summary: Record<string, any>;
  validation_status: ValidationStatus;
}

export interface ValidationStatus {
  bmi_check: {
    validated: boolean;
    present_in_summary: boolean;
    calculated_values?: Array<{
      weight_kg: number;
      height_cm: number;
      bmi: number;
      category: string;
      context?: string;
    }>;
    issues?: string[];
  };
  dosage_check: {
    validated: boolean;
    present_in_summary: boolean;
    found_dosages?: string[];
    issues?: string[];
  };
  medicine_check: {
    validated: boolean;
    present_in_summary: boolean;
    found_medications?: string[];
    standardized_names?: string[];
    issues?: string[];
  };
  id_check: {
    validated: boolean;
    present_in_summary: boolean;
    patient_id?: string | number;
    quiz_id?: number;
    uuid?: string;
    order_id?: number;
    issues?: string[];
  };
}

// Known valid medications for weight management
const VALID_MEDICATIONS = [
  "Mounjaro",
  "Saxenda",
  "Wegovy",
  "Ozempic",
  "Victoza",
  "Trulicity",
  "Rybelsus",
];

// Standard dosages for common medications
const MEDICATION_DOSAGES: Record<string, string[]> = {
  Mounjaro: ["2.5mg", "5mg", "7.5mg", "10mg", "12.5mg", "15mg"],
  Saxenda: ["0.6mg", "1.2mg", "1.8mg", "2.4mg", "3mg"],
  Wegovy: ["0.25mg", "0.5mg", "1mg", "1.7mg", "2.4mg"],
  Ozempic: ["0.25mg", "0.5mg", "1mg", "2mg"],
  Victoza: ["0.6mg", "1.2mg", "1.8mg"],
  Trulicity: ["0.75mg", "1.5mg", "3mg", "4.5mg"],
  Rybelsus: ["3mg", "7mg", "14mg"],
};

function calculateBMI(
  weightKg: number,
  heightCm: number,
): { bmi: number; category: string } {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  let category: string;
  if (bmi < 18.5) category = "Underweight";
  else if (bmi < 25) category = "Normal";
  else if (bmi < 30) category = "Overweight";
  else category = "Obese";

  return { bmi: Math.round(bmi * 10) / 10, category };
}

function validateMedication(medicationName: string): {
  isValid: boolean;
  standardizedName?: string;
  message?: string;
} {
  const normalized = medicationName.trim().toLowerCase();

  const found = VALID_MEDICATIONS.find(
    (med) => med.toLowerCase() === normalized,
  );

  if (!found) {
    // Try fuzzy matching
    const similar = VALID_MEDICATIONS.find(
      (med) =>
        med.toLowerCase().includes(normalized) ||
        normalized.includes(med.toLowerCase()),
    );

    if (similar) {
      return {
        isValid: true,
        standardizedName: similar,
        message: `Standardized "${medicationName}" to "${similar}"`,
      };
    }

    return {
      isValid: false,
      message: `Unknown medication: ${medicationName}. Valid medications: ${VALID_MEDICATIONS.join(", ")}`,
    };
  }

  return { isValid: true, standardizedName: found };
}

function validateDosage(
  medication: string,
  dosage: string,
): {
  isValid: boolean;
  message?: string;
} {
  const validDosages = MEDICATION_DOSAGES[medication];
  if (!validDosages) {
    return {
      isValid: false,
      message: `No dosage information available for: ${medication}`,
    };
  }

  // Normalize dosage format
  const normalizedDosage = dosage.trim().toLowerCase();

  const isValid = validDosages.some(
    (validDose) => validDose.toLowerCase() === normalizedDosage,
  );

  if (!isValid) {
    return {
      isValid: false,
      message: `Invalid dosage "${dosage}" for ${medication}. Valid dosages: ${validDosages.join(", ")}`,
    };
  }

  return { isValid: true };
}

function validateIDs(payload: Record<string, any>): {
  isValid: boolean;
  issues: string[];
  validated_ids: {
    patient_id?: string | number;
    quiz_id?: number;
    uuid?: string;
    order_id?: number;
  };
} {
  const issues: string[] = [];
  const validated_ids: any = {};

  // Patient ID validation - can be string or number
  if (!payload.patient_id) {
    issues.push("patient_id is missing");
  } else {
    validated_ids.patient_id = payload.patient_id;
  }

  // UUID validation - optional
  if (payload.uuid) {
    validated_ids.uuid = payload.uuid;
  }

  return {
    isValid: issues.length === 0,
    issues,
    validated_ids,
  };
}

function extractWeightFromAnswer(answerText: string): number | null {
  try {
    const parsed = JSON.parse(answerText);
    if (parsed.weight_kg) {
      return parseFloat(parsed.weight_kg);
    }
  } catch {
    // Not JSON, ignore
  }
  return null;
}

function extractHeightFromAnswer(answerText: string): number | null {
  try {
    const parsed = JSON.parse(answerText);
    if (parsed.height_cm) {
      return parseFloat(parsed.height_cm);
    }
  } catch {
    // Not JSON, ignore
  }
  return null;
}

function extractAndValidateData(
  result: any,
  payload: Record<string, any>,
): ValidationStatus {
  const validation: ValidationStatus = {
    bmi_check: {
      validated: false,
      present_in_summary: false,
      issues: [],
    },
    dosage_check: {
      validated: false,
      present_in_summary: false,
      issues: [],
    },
    medicine_check: {
      validated: false,
      present_in_summary: false,
      issues: [],
    },
    id_check: {
      validated: false,
      present_in_summary: false,
      issues: [],
    },
  };

  // Validate IDs
  const idValidation = validateIDs(payload);
  validation.id_check.validated = idValidation.isValid;
  validation.id_check.issues = idValidation.issues;
  validation.id_check = {
    ...validation.id_check,
    ...idValidation.validated_ids,
  };

  // Check if IDs are present in summary
  const summaryText = (result.summary_text || "").toLowerCase();
  const structuredSummary = result.structured_summary || {};

  if (
    structuredSummary.patient_info?.patient_id ||
    summaryText.includes(String(payload.patient_id).toLowerCase())
  ) {
    validation.id_check.present_in_summary = true;
  }

  // Extract height and weights from payload
  let heightCm: number | null = null;
  const weightData: Array<{ weight: number; context: string; date?: string }> =
    [];

  // Parse main_quiz answers
  if (payload.main_quiz?.answers) {
    payload.main_quiz.answers.forEach((answer: any) => {
      // Extract height
      if (answer.question_title?.includes("height")) {
        const h = extractHeightFromAnswer(answer.answer_text);
        if (h) heightCm = h;
      }

      // Extract current weight from main quiz
      if (
        answer.question_title?.includes("current weight") ||
        answer.question_title?.includes("height and current weight")
      ) {
        const w = extractWeightFromAnswer(answer.answer_text);
        if (w) {
          weightData.push({ weight: w, context: "Main Quiz - Current Weight" });
        }
      }

      // Extract goal weight
      if (answer.question_title?.includes("goal weight")) {
        const w = extractWeightFromAnswer(answer.answer_text);
        if (w) {
          weightData.push({ weight: w, context: "Goal Weight" });
        }
      }

      // Extract medication starting weights
      if (answer.question_title?.includes("before beginning")) {
        const medication = answer.question_title.match(
          /before beginning (\w+)/i,
        )?.[1];
        const w = extractWeightFromAnswer(answer.answer_text);
        if (w && medication) {
          weightData.push({
            weight: w,
            context: `Before ${medication}`,
            date: answer.answer_text, // May contain date
          });
        }
      }
    });
  }

  // Extract current weight from order_quiz
  if (payload.order_quiz?.answers) {
    payload.order_quiz.answers.forEach((answer: any) => {
      if (answer.question_title?.includes("current weight")) {
        const w = extractWeightFromAnswer(answer.answer_text);
        if (w) {
          weightData.push({
            weight: w,
            context: "Order Quiz - Current Weight",
            date: payload.order_quiz.updated_at,
          });
        }
      }
    });
  }

  // BMI Validation
  if (heightCm && weightData.length > 0) {
    validation.bmi_check.calculated_values = [];

    weightData.forEach((data) => {
      const calculated = calculateBMI(data.weight, heightCm!);
      validation.bmi_check.calculated_values!.push({
        weight_kg: data.weight,
        height_cm: heightCm!,
        bmi: calculated.bmi,
        category: calculated.category,
        context: data.context,
      });
    });

    validation.bmi_check.validated = true;
  } else {
    if (!heightCm) {
      validation.bmi_check.issues!.push(
        "Missing height data for BMI calculation",
      );
    }
    if (weightData.length === 0) {
      validation.bmi_check.issues!.push(
        "Missing weight data for BMI calculation",
      );
    }
  }

  // Check if BMI is present in summary
  if (
    summaryText.includes("bmi") ||
    structuredSummary.weight_progression?.timeline?.[0]?.bmi
  ) {
    validation.bmi_check.present_in_summary = true;
  }

  // Medicine Validation - extract from order history
  const medications = new Set<string>();
  const dosages = new Map<string, string>();

  // Extract from order history
  if (payload.order_history?.orders) {
    payload.order_history.orders.forEach((order: any) => {
      if (order.product) {
        medications.add(order.product);
        if (order.dosage) {
          dosages.set(order.product, order.dosage);
        }
      }
    });
  }

  // Extract from main quiz answers (medications used)
  if (payload.main_quiz?.answers) {
    payload.main_quiz.answers.forEach((answer: any) => {
      if (answer.question_title?.includes("medicines to support weight loss")) {
        const med = answer.answer_text;
        if (med) medications.add(med);
      }
    });
  }

  // Validate medications
  if (medications.size > 0) {
    validation.medicine_check.found_medications = Array.from(medications);
    validation.medicine_check.standardized_names = [];

    medications.forEach((med) => {
      const medValidation = validateMedication(med);
      if (medValidation.isValid && medValidation.standardizedName) {
        validation.medicine_check.standardized_names!.push(
          medValidation.standardizedName,
        );
      } else {
        validation.medicine_check.issues!.push(
          medValidation.message || `Invalid medication: ${med}`,
        );
      }
    });

    validation.medicine_check.validated =
      validation.medicine_check.issues!.length === 0;
  } else {
    validation.medicine_check.issues!.push(
      "No medication history found in payload",
    );
  }

  // Check if medications are present in summary
  if (
    summaryText.includes("mounjaro") ||
    summaryText.includes("saxenda") ||
    summaryText.includes("wegovy") ||
    summaryText.includes("medication")
  ) {
    validation.medicine_check.present_in_summary = true;
  }

  // Dosage Validation
  if (dosages.size > 0) {
    validation.dosage_check.found_dosages = [];

    dosages.forEach((dosage, medication) => {
      validation.dosage_check.found_dosages!.push(`${medication}: ${dosage}`);

      const medValidation = validateMedication(medication);
      if (medValidation.isValid && medValidation.standardizedName) {
        const dosageValidation = validateDosage(
          medValidation.standardizedName,
          dosage,
        );

        if (!dosageValidation.isValid) {
          validation.dosage_check.issues!.push(
            dosageValidation.message || `Invalid dosage for ${medication}`,
          );
        }
      }
    });

    validation.dosage_check.validated =
      validation.dosage_check.issues!.length === 0;
  } else {
    validation.dosage_check.issues!.push(
      "No dosage information found in order history",
    );
  }

  // Check if dosages are present in summary
  if (summaryText.match(/\d+\.?\d*\s*mg/) || dosages.size > 0) {
    validation.dosage_check.present_in_summary = true;
  }

  return validation;
}

export async function handleQuiz(
  payload: Record<string, any>,
): Promise<HandleQuizResult> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }

    const inputStr = JSON.stringify(payload, null, 2);

    const prompt = `You are an AI assistant specialized in creating comprehensive medical summaries from patient quiz data with focus on weight management journey, medication history, and health metrics progression.

CRITICAL INSTRUCTIONS - You MUST analyze and include ALL of the following in your summary:

IMPORTANT: The input data has the following structure:
- patient_id: Top level patient identifier
- main_quiz: Contains main questionnaire answers with updated_at timestamp
- order_quiz: Contains order-specific questions with updated_at timestamp  
- order_history: Contains all orders with product, dosage, dates, and status

1. PATIENT DEMOGRAPHICS:
   - Extract from main_quiz answers: age range, sex, ethnicity
   - How long they've been managing weight

2. WEIGHT PROGRESSION (Extract from BOTH main_quiz and order_quiz):
   - Starting weights before each medication (from main_quiz)
   - Current weight from main_quiz (question about "height and current weight")
   - Latest weight from order_quiz (question about "current weight")
   - Calculate total weight change and percentage
   - Identify which medication periods had most/least weight loss

3. BMI CALCULATIONS (MANDATORY):
   - Extract height from main_quiz (question about "height and current weight")
   - Calculate BMI at each weight point using: BMI = weight(kg) / (height(m))²
   - Show BMI progression over time
   - Categorize each BMI (Underweight <18.5, Normal 18.5-24.9, Overweight 25-29.9, Obese ≥30)
   - MUST include BMI values in both summary_text and structured_summary

4. GOAL TRACKING:
   - Target weight from main_quiz
   - Progress toward goal (calculate remaining kg and percentage)

5. MEDICATION HISTORY (Extract from order_history AND main_quiz):
   - List ALL medications from order_history.orders (product field)
   - List medications mentioned in main_quiz answers (question about "medicines to support weight loss")
   - For EACH medication include:
     * Name and dosage from order_history
     * Dates from answers (when started, when stopped)
     * Weight at start (from "before beginning X" questions)
     * Current medication status
     * Side effects from answers
   - MUST include medication names and dosages

6. CURRENT STATUS:
   - Latest order from order_history.orders[0]
   - Current medication and dosage
   - Feeling score from order_quiz
   - Side effects from order_quiz
   - Adherence from order_quiz

7. HEALTH CONDITIONS (from main_quiz):
   - Diabetes status and family history
   - Other health conditions
   - Allergies
   - Other medications

8. PREVIOUS APPROACHES (from main_quiz):
   - Methods tried before medications

9. ORDER HISTORY:
   - Total orders from order_history.total_orders
   - All orders with dates, status, products

Respond ONLY with valid JSON in this exact format:
{
  "summary_text": "A comprehensive narrative summary (3-5 paragraphs) covering: patient background (ID: ${payload.patient_id}), complete weight journey with all measurements and dates, BMI progression analysis with specific BMI values, detailed medication history with EXACT DOSAGES, current status, and recommendations. Include specific numbers, dates, percentages, and BMI values.",
  "structured_summary": {
    "patient_info": {
      "patient_id": ${payload.patient_id},
      "age_range": "from main_quiz",
      "sex": "from main_quiz",
      "ethnicity": "from main_quiz",
      "weight_challenge_duration": "from main_quiz"
    },
    "weight_progression": {
      "timeline": [
        {
          "date": "date or context",
          "weight_kg": "value",
          "bmi": "calculated - MANDATORY",
          "bmi_category": "category - MANDATORY",
          "context": "e.g., Before Mounjaro, Current Weight"
        }
      ],
      "total_weight_lost_kg": "calculated",
      "total_weight_lost_percentage": "calculated"
    },
    "height_info": {
      "current_height_cm": "value from main_quiz - MANDATORY"
    },
    "goals": {
      "target_weight_kg": "from main_quiz",
      "current_weight_kg": "latest from order_quiz",
      "remaining_kg": "calculated",
      "progress_percentage": "calculated"
    },
    "medication_history": [
      {
        "medication": "name from order_history - MANDATORY",
        "dosage": "from order_history - MANDATORY",
        "start_date": "from main_quiz answers",
        "end_date": "from main_quiz or 'current'",
        "starting_weight_kg": "from 'before beginning' questions",
        "currently_taking": "from answers",
        "side_effects": "from answers"
      }
    ],
    "current_status": {
      "current_medication": "from latest order",
      "current_dosage": "from latest order",
      "feeling_score": "from order_quiz",
      "side_effects": "from order_quiz",
      "adherence": "from order_quiz"
    },
    "health_conditions": {
      "diabetes": "from main_quiz",
      "family_history": "from main_quiz",
      "allergies": "from main_quiz",
      "other_conditions": "from main_quiz"
    },
    "previous_approaches": ["from main_quiz"],
    "orders": {
      "total_orders": ${payload.order_history?.total_orders || 0},
      "latest_order": {
        "order_id": "from order_history",
        "product": "from order_history",
        "dosage": "from order_history",
        "plan": "from order_history",
        "status": "from order_history",
        "created_at": "from order_history"
      }
    }
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
            maxOutputTokens: 8192,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`,
      );
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Try to extract JSON from response
    let parsedResult: any = {};
    try {
      const jsonStart = responseText.indexOf("{");
      const jsonEnd = responseText.lastIndexOf("}") + 1;

      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonStr = responseText.substring(jsonStart, jsonEnd);
        parsedResult = JSON.parse(jsonStr);
      }
    } catch (parseError) {
      console.error("[Gemini] JSON parsing failed:", parseError);
      parsedResult = {
        summary_text: responseText,
        structured_summary: { raw_response: responseText },
      };
    }

    // Validate the response
    const validation = extractAndValidateData(parsedResult, payload);

    return {
      summary_text: parsedResult.summary_text || "",
      structured_summary: parsedResult.structured_summary || {},
      validation_status: validation,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Gemini] Quiz processing error:", errorMessage);

    return {
      summary_text: `Error processing quiz: ${errorMessage}`,
      structured_summary: { error: errorMessage, status: "failed" },
      validation_status: {
        bmi_check: {
          validated: false,
          present_in_summary: false,
          issues: ["Error occurred before validation"],
        },
        dosage_check: {
          validated: false,
          present_in_summary: false,
          issues: ["Error occurred before validation"],
        },
        medicine_check: {
          validated: false,
          present_in_summary: false,
          issues: ["Error occurred before validation"],
        },
        id_check: {
          validated: false,
          present_in_summary: false,
          issues: ["Error occurred before validation"],
        },
      },
    };
  }
}
