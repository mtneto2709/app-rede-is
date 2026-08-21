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

export default function FirstAccessPage() {
  const router = useRouter();
  const { setAccessToken } = useAuth();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem(FIRST_ACCESS_TOKEN_KEY);
    if (!token) {
      router.replace("/login");
      return;
    }

    fetch("/api/bff/first-access/questionnaire", { headers: { "x-first-access-token": token } })
      .then((res) => {
        if (!res.ok) throw new Error("Não foi possível carregar o questionário.");
        return res.json();
      })
      .then((data) => {
        setAttemptId(data.attemptId);
        setQuestions(data.questions);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [router]);

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
      const data = await res.json();
      if (!res.ok || data.status !== "authenticated") {
        throw new Error("Não foi possível validar sua identidade. Procure o suporte do seu município.");
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

  if (isLoading) return <main className="p-6 text-center text-text-secondary">Carregando...</main>;

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
