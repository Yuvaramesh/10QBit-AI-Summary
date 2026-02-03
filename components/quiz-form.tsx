"use client";

import type React from "react";

import { useState } from "react";
import type { QuizRequest, QuizResponse } from "@/types/quiz";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export function QuizForm() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<QuizResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    jsonPayload: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;
    setFormData({ jsonPayload: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Parse the JSON payload
      let payload: QuizRequest;
      try {
        payload = JSON.parse(formData.jsonPayload);
      } catch (parseError) {
        throw new Error("Invalid JSON format. Please check your input.");
      }

      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      const data = (await res.json()) as QuizResponse;
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const ValidationCheck = ({
    label,
    validated,
    present,
    issues,
    details,
  }: {
    label: string;
    validated: boolean;
    present: boolean;
    issues?: string[];
    details?: any;
  }) => (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{label}</span>
        <div className="flex gap-2">
          {validated ? (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs">Validated</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600">
              <XCircle className="w-4 h-4" />
              <span className="text-xs">Not Validated</span>
            </div>
          )}
          {present ? (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs">Present</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">Missing</span>
            </div>
          )}
        </div>
      </div>

      {details && (
        <div className="text-xs bg-secondary/50 p-2 rounded">
          <pre className="overflow-auto max-h-24">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      )}

      {issues && issues.length > 0 && (
        <div className="space-y-1">
          {issues.map((issue, idx) => (
            <div
              key={idx}
              className="text-xs text-red-600 flex items-start gap-1"
            >
              <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{issue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const examplePayload = {
    patient_id: 137,
    main_quiz: {
      updated_at: "2025-11-05T16:53:21+00:00",
      answers: [
        {
          question_id: 1,
          question_title: "Please tell us your age.",
          answer_text: "18 to 74",
        },
        {
          question_id: 6,
          question_title: "Please add your height and current weight.",
          answer_text:
            '{"height_cm":"171","weight_kg":"81","bmi":27.70083102493075}',
        },
      ],
    },
    order_quiz: {
      updated_at: "2025-11-06T15:35:13+00:00",
      answers: [
        {
          question_id: 77,
          question_title: "What is your current weight?",
          answer_text: '{"weight_kg":"78.00"}',
        },
      ],
    },
    order_history: {
      total_orders: 2,
      orders: [
        {
          order_id: 111,
          product: "Mounjaro",
          product_plan: "1 month",
          dosage: "2.5mg",
          order_created_at: "2025-11-06T15:36:11+00:00",
          order_state: "clinicalCheck",
        },
      ],
    },
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl">Quiz Summary Agent</CardTitle>
          <CardDescription>
            Paste your complete quiz JSON payload to get AI-powered summaries
            with validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jsonPayload">JSON Payload</Label>
              <Textarea
                id="jsonPayload"
                name="jsonPayload"
                value={formData.jsonPayload}
                onChange={handleInputChange}
                placeholder={JSON.stringify(examplePayload, null, 2)}
                rows={15}
                required
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Paste the complete JSON payload including patient_id, main_quiz,
                order_quiz, and order_history
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {loading ? "Processing..." : "Analyze Quiz Data"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {response && response.validation_status && (
        <>
          {/* Validation Status Card */}
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardHeader>
              <CardTitle className="text-lg">Validation Status</CardTitle>
              <CardDescription>
                Automated checks for data quality and completeness
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ValidationCheck
                label="BMI Calculations"
                validated={
                  response.validation_status.bmi_check?.validated ?? false
                }
                present={
                  response.validation_status.bmi_check?.present_in_summary ??
                  false
                }
                issues={response.validation_status.bmi_check?.issues}
                details={
                  response.validation_status.bmi_check?.calculated_values
                }
              />

              <ValidationCheck
                label="Medication Names"
                validated={
                  response.validation_status.medicine_check?.validated ?? false
                }
                present={
                  response.validation_status.medicine_check
                    ?.present_in_summary ?? false
                }
                issues={response.validation_status.medicine_check?.issues}
                details={{
                  found:
                    response.validation_status.medicine_check
                      ?.found_medications,
                  standardized:
                    response.validation_status.medicine_check
                      ?.standardized_names,
                }}
              />

              <ValidationCheck
                label="Medication Dosages"
                validated={
                  response.validation_status.dosage_check?.validated ?? false
                }
                present={
                  response.validation_status.dosage_check?.present_in_summary ??
                  false
                }
                issues={response.validation_status.dosage_check?.issues}
                details={response.validation_status.dosage_check?.found_dosages}
              />

              <ValidationCheck
                label="Patient Identifiers"
                validated={
                  response.validation_status.id_check?.validated ?? false
                }
                present={
                  response.validation_status.id_check?.present_in_summary ??
                  false
                }
                issues={response.validation_status.id_check?.issues}
                details={{
                  patient_id: response.validation_status.id_check?.patient_id,
                  quiz_id: response.validation_status.id_check?.quiz_id,
                  uuid: response.validation_status.id_check?.uuid,
                  order_id: response.validation_status.id_check?.order_id,
                }}
              />
            </CardContent>
          </Card>

          {/* Summary Results Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Summary Results</CardTitle>
              <CardDescription>{response.timestamp}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm mb-2">Summary</h3>
                <div className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                  {response.summary}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Structured Data</h3>
                <pre className="bg-secondary/50 p-3 rounded text-xs overflow-auto max-h-96">
                  {JSON.stringify(response.structured_summary, null, 2)}
                </pre>
              </div>

              <p className="text-xs text-foreground/60">
                Agent: {response.agent}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
