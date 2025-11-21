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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function QuizForm() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<QuizResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    patient_id: "",
    quiz_id: "",
    uuid: "",
    order_id: "",
    session_answers: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Parse session_answers as JSON or split by lines
      let answers;
      try {
        answers = JSON.parse(formData.session_answers);
      } catch {
        answers = formData.session_answers
          .split("\n")
          .filter((line) => line.trim());
      }

      const payload: QuizRequest = {
        patient_id: formData.patient_id,
        quiz_id: Number.parseInt(formData.quiz_id, 10),
        uuid: formData.uuid,
        order_id: Number.parseInt(formData.order_id, 10),
        session_answers: answers,
      };

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

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl">Quiz Summary Agent</CardTitle>
          <CardDescription>
            Submit quiz data to get AI-powered summaries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patient_id">Patient ID</Label>
                <Input
                  id="patient_id"
                  name="patient_id"
                  value={formData.patient_id}
                  onChange={handleInputChange}
                  placeholder="e.g., P12345"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quiz_id">Quiz ID</Label>
                <Input
                  id="quiz_id"
                  name="quiz_id"
                  type="number"
                  value={formData.quiz_id}
                  onChange={handleInputChange}
                  placeholder="e.g., 1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="uuid">UUID</Label>
                <Input
                  id="uuid"
                  name="uuid"
                  value={formData.uuid}
                  onChange={handleInputChange}
                  placeholder="e.g., abc-123-def"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order_id">Order ID</Label>
                <Input
                  id="order_id"
                  name="order_id"
                  type="number"
                  value={formData.order_id}
                  onChange={handleInputChange}
                  placeholder="e.g., 5001"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session_answers">Session Answers</Label>
              <Textarea
                id="session_answers"
                name="session_answers"
                value={formData.session_answers}
                onChange={handleInputChange}
                placeholder="Enter answers as JSON array or line-separated text&#10;Example: [&#34;answer1&#34;, &#34;answer2&#34;] or&#10;answer1&#10;answer2"
                rows={5}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {loading ? "Processing..." : "Summarize Quiz"}
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

      {response && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Summary Results</CardTitle>
            <CardDescription>{response.timestamp}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-2">Summary</h3>
              <p className="text-sm leading-relaxed text-foreground/80">
                {response.summary}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2">Structured Data</h3>
              <pre className="bg-secondary/50 p-3 rounded text-xs overflow-auto max-h-48">
                {JSON.stringify(response.structured_summary, null, 2)}
              </pre>
            </div>

            <p className="text-xs text-foreground/60">
              Agent: {response.agent}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
