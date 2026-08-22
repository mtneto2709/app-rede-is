"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FIRST_ACCESS_TOKEN_KEY } from "@/components/login-form";

interface Question {
  id: string;
  prompt: string;
  options: { id: string; label: string }[];
}

interface Candidate {
  sourceSystem: "sistema-is" | "esus-pec";
  sourcePatientId: string;
  maskedName: string;
}

type Step = { kind: "loading" } | { kind: "candidates"; candidates: Candidate[] } | { kind: "questions" };

export default function FirstAccessPage() {
  const router = useRouter();
  const { setAccessToken } = useAuth();

  const [step, setStep] = useState<Step>({ kind: "loading" });
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function loadStart() {
    const token = sessionStorage.getItem(FIRST_ACCESS_TOKEN_KEY);
    if (!token) {
      router.replace("/login");
      return;
    }

    fetch("/api/bff/first-access/questionnaire", { headers: { "x-first-access-token": token } })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message ?? "Não foi possível carregar o questionário.");
        }
        return data;
      })
      .then((data) => {
        if (data.status === "candidates") {
          setStep({ kind: "candidates", candidates: data.candidates });
        } else {
          setAttemptId(data.attemptId);
          setQuestions(data.questions);
          setStep({ kind: "questions" });
        }
      })
      .catch((err) => setError(err.message));
  }

  useEffect(loadStart, [router]);

  async function handleSelectCandidate(candidate: Candidate) {
    const token = sessionStorage.getItem(FIRST_ACCESS_TOKEN_KEY);
    if (!token) return;

    setError(null);
    try {
      const res = await fetch("/api/bff/first-access/candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-first-access-token": token },
        body: JSON.stringify({ sourceSystem: candidate.sourceSystem, sourcePatientId: candidate.sourcePatientId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Não foi possível carregar o questionário para esse cadastro.");
      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setStep({ kind: "questions" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const token = sessionStorage.getItem(FIRST_ACCESS_TOKEN_KEY);
    if (!token || !attemptId) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bff/first-access/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-first-access-token": token },
        body: JSON.stringify({
          attemptId,
          answers: Object.entries(answers).map(([questionId, optionId]) => ({ questionId, optionId })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status !== "authenticated") {
        throw new Error(data.message ?? "Não foi possível validar sua identidade. Procure o suporte do seu município.");
      }
      sessionStorage.removeItem(FIRST_ACCESS_TOKEN_KEY);
      setAccessToken(data.accessToken);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step.kind === "loading" && !error) {
    return <main className="p-6 text-center text-text-secondary">Carregando...</main>;
  }

  if (step.kind === "candidates") {
    return (
      <main className="max-w-md mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-lg font-semibold">Qual cadastro é o seu?</h1>
          <p className="text-sm text-text-secondary mt-1">
            Encontramos mais de um cadastro com esse contato. Selecione o seu nome para continuar.
          </p>
        </div>
        <div className="space-y-3">
          {step.candidates.map((c) => (
            <button
              key={`${c.sourceSystem}:${c.sourcePatientId}`}
              onClick={() => handleSelectCandidate(c)}
              className="w-full text-left"
            >
              <Card className="p-4 hover:border-primary/40">
                <p className="text-sm font-medium">{c.maskedName}</p>
              </Card>
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Confirme sua identidade</h1>
        <p className="text-sm text-text-secondary mt-1">
          Como este é o seu primeiro acesso, responda as perguntas abaixo para confirmarmos que é você.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {questions.map((q) => (
          <Card key={q.id} className="p-4 space-y-3">
            <p className="text-sm font-medium">{q.prompt}</p>
            <div className="space-y-2">
              {q.options.map((option) => (
                <label key={option.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={q.id}
                    value={option.id}
                    required
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: option.id }))}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </Card>
        ))}

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Validando..." : "Confirmar"}
        </Button>
      </form>
    </main>
  );
}
