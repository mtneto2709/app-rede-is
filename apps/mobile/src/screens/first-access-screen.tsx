import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { QuestionnaireQuestion, IdentityCandidate } from "@rede-is/shared-types";
import { useTheme } from "@/theme/theme-provider";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api-client";
import type { RootStackParamList } from "@/navigation/root-navigator";

type Props = NativeStackScreenProps<RootStackParamList, "FirstAccess">;
type Step = { kind: "loading" } | { kind: "candidates"; candidates: IdentityCandidate[] } | { kind: "questions" };

export function FirstAccessScreen({ route }: Props) {
  const { firstAccessToken } = route.params;
  const theme = useTheme();
  const { setAccessToken } = useAuth();

  const [step, setStep] = useState<Step>({ kind: "loading" });
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    authApi
      .getQuestionnaire(theme.slug, firstAccessToken)
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
  }, [theme.slug, firstAccessToken]);

  async function handleSelectCandidate(candidate: IdentityCandidate) {
    setError(null);
    try {
      const data = await authApi.selectCandidate(theme.slug, firstAccessToken, {
        sourceSystem: candidate.sourceSystem,
        sourcePatientId: candidate.sourcePatientId,
      });
      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setStep({ kind: "questions" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    }
  }

  async function handleSubmit() {
    if (!attemptId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await authApi.submitQuestionnaire(
        theme.slug,
        firstAccessToken,
        attemptId,
        Object.entries(answers).map(([questionId, optionId]) => ({ questionId, optionId })),
      );
      if (result.status === "authenticated" && result.accessToken) {
        setAccessToken(result.accessToken);
      } else {
        throw new Error("Não foi possível validar sua identidade.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setIsSubmitting(false);
    }
  }

  const styles = createStyles(theme);

  if (step.kind === "loading" && !error) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (step.kind === "candidates") {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, gap: 16 }}>
        <Text style={styles.title}>Qual cadastro é o seu?</Text>
        <Text style={styles.subtitle}>
          Encontramos mais de um cadastro com esse contato. Toque no seu nome para continuar.
        </Text>
        {step.candidates.map((c) => (
          <Pressable
            key={`${c.sourceSystem}:${c.sourcePatientId}`}
            style={styles.card}
            onPress={() => handleSelectCandidate(c)}
          >
            <Text style={styles.prompt}>{c.maskedName}</Text>
          </Pressable>
        ))}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Text style={styles.title}>Confirme sua identidade</Text>
      <Text style={styles.subtitle}>
        Como este é o seu primeiro acesso, responda as perguntas abaixo para confirmarmos que é você.
      </Text>

      {questions.map((q) => (
        <View key={q.id} style={styles.card}>
          <Text style={styles.prompt}>{q.prompt}</Text>
          {q.options.map((option) => (
            <Pressable
              key={option.id}
              style={styles.optionRow}
              onPress={() => setAnswers((prev) => ({ ...prev, [q.id]: option.id }))}
            >
              <View style={[styles.radio, answers[q.id] === option.id && styles.radioSelected]} />
              <Text style={styles.optionLabel}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ))}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color={theme.colors.primaryForeground} /> : <Text style={styles.buttonText}>Confirmar</Text>}
      </Pressable>
    </ScrollView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background },
    title: { fontSize: 18, fontWeight: "600", color: theme.colors.textPrimary },
    subtitle: { fontSize: 13, color: theme.colors.textSecondary },
    card: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, gap: 8 },
    prompt: { fontSize: 14, fontWeight: "500", color: theme.colors.textPrimary },
    optionRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
    radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.textSecondary },
    radioSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    optionLabel: { fontSize: 13, color: theme.colors.textPrimary },
    error: { color: theme.colors.danger, fontSize: 13 },
    button: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    buttonText: { color: theme.colors.primaryForeground, fontWeight: "600" },
  });
}
