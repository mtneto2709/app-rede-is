import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTheme } from "@/theme/theme-provider";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api-client";
import type { RootStackParamList } from "@/navigation/root-navigator";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;
type Channel = "sms" | "whatsapp" | "email";

const CHANNEL_LABEL: Record<Channel, string> = { sms: "SMS", whatsapp: "WhatsApp", email: "E-mail" };

export function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const { setAccessToken } = useAuth();

  const [step, setStep] = useState<"contact" | "code">("contact");
  const [channel, setChannel] = useState<Channel>(theme.auth.otpChannels[0] ?? "sms");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequestCode() {
    setError(null);
    setIsSubmitting(true);
    try {
      await authApi.requestOtp(theme.slug, channel, contact);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyCode() {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await authApi.verifyOtp(theme.slug, channel, contact, code);
      if (result.status === "authenticated" && result.accessToken) {
        setAccessToken(result.accessToken);
      } else if (result.status === "first_access_required" && result.firstAccessToken) {
        navigation.navigate("FirstAccess", { firstAccessToken: result.firstAccessToken });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido ou expirado");
    } finally {
      setIsSubmitting(false);
    }
  }

  const styles = createStyles(theme);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image source={{ uri: theme.branding.logoLightUrl }} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>{theme.branding.appName}</Text>
        <Text style={styles.subtitle}>Acesse seus atendimentos, agendamentos e documentos de saúde.</Text>

        {step === "contact" ? (
          <>
            {theme.auth.otpChannels.length > 1 && (
              <View style={styles.channelRow}>
                {theme.auth.otpChannels.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setChannel(c)}
                    style={[styles.channelButton, channel === c && styles.channelButtonActive]}
                  >
                    <Text style={channel === c ? styles.channelTextActive : styles.channelText}>{CHANNEL_LABEL[c]}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <TextInput
              style={styles.input}
              placeholder={channel === "email" ? "seuemail@exemplo.com" : "(00) 00000-0000"}
              keyboardType={channel === "email" ? "email-address" : "phone-pad"}
              value={contact}
              onChangeText={setContact}
              autoCapitalize="none"
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable style={styles.button} onPress={handleRequestCode} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color={theme.colors.primaryForeground} /> : <Text style={styles.buttonText}>Enviar código</Text>}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>Digite o código enviado para {contact}.</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="000000"
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable style={styles.button} onPress={handleVerifyCode} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color={theme.colors.primaryForeground} /> : <Text style={styles.buttonText}>Confirmar</Text>}
            </Pressable>
            <Pressable onPress={() => setStep("contact")}>
              <Text style={styles.linkText}>Usar outro contato</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    container: { flexGrow: 1, padding: 24, justifyContent: "center", gap: 12 },
    logo: { height: 56, alignSelf: "center", marginBottom: 8 },
    title: { fontSize: 20, fontWeight: "600", textAlign: "center", color: theme.colors.textPrimary },
    subtitle: { fontSize: 13, textAlign: "center", color: theme.colors.textSecondary, marginBottom: 8 },
    channelRow: { flexDirection: "row", gap: 8 },
    channelButton: { flex: 1, borderWidth: 1, borderColor: "#00000020", borderRadius: 10, paddingVertical: 10, alignItems: "center" },
    channelButtonActive: { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}15` },
    channelText: { fontSize: 13, color: theme.colors.textSecondary },
    channelTextActive: { fontSize: 13, color: theme.colors.primary, fontWeight: "600" },
    input: { borderWidth: 1, borderColor: "#00000020", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
    codeInput: { textAlign: "center", fontSize: 20, letterSpacing: 6 },
    error: { color: theme.colors.danger, fontSize: 13 },
    button: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    buttonText: { color: theme.colors.primaryForeground, fontWeight: "600" },
    linkText: { color: theme.colors.textSecondary, textAlign: "center", fontSize: 13, marginTop: 4 },
  });
}
