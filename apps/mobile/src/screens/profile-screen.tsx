import { useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PatientProfileSummary } from "@rede-is/shared-types";
import { useAuth } from "@/lib/auth-context";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { authApi } from "@/lib/api-client";
import { ScreenHeader } from "@/components/screen-header";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | null;
}) {
  const theme = useTheme();
  if (!value) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
      <Ionicons name={icon} size={16} color={theme.colors.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, color: theme.colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary }}>{value}</Text>
      </View>
    </View>
  );
}

export function ProfileScreen() {
  const theme = useTheme();
  const { accessToken, logout } = useAuth();
  const { data: profile, isLoading } = useMeQuery<PatientProfileSummary>("profile");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const styles = createStyles(theme);

  async function handleDeleteAccount() {
    if (!accessToken) return;
    setIsDeleting(true);
    try {
      await authApi.deleteAccount(theme.slug, accessToken);
      await logout();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Meu Perfil" />
      <View style={styles.content}>
        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 8 }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: `${theme.colors.primary}1A`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>
                    {profile?.name ? initials(profile.name) : "?"}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary }}>
                  {profile?.name || "—"}
                </Text>
              </View>
              <InfoRow icon="card-outline" label="CPF" value={profile?.cpf ?? null} />
              <InfoRow icon="calendar-outline" label="Data de nascimento" value={formatDate(profile?.birthDate ?? null)} />
              <InfoRow icon="medical-outline" label="Cartão Nacional de Saúde" value={profile?.cns ?? null} />
              <InfoRow icon="call-outline" label="Telefone" value={profile?.phone ?? null} />
              <InfoRow icon="mail-outline" label="E-mail" value={profile?.email ?? null} />
            </>
          )}
          <Text style={[styles.cardText, { paddingTop: 8 }]}>
            Esses dados vêm diretamente do Sistema IS / e-SUS PEC e não podem ser editados por aqui.
          </Text>
        </View>

        <Pressable style={styles.outlineButton} onPress={logout}>
          <Text style={styles.outlineButtonText}>Sair</Text>
        </Pressable>

        <View style={[styles.card, { borderWidth: 1, borderColor: `${theme.colors.danger}40` }]}>
          <Text style={[styles.cardText, { color: theme.colors.danger, fontWeight: "600" }]}>Excluir conta</Text>
          <Text style={styles.cardText}>
            Isso remove seu acesso à plataforma e revoga suas sessões. Seu histórico clínico permanece nas bases de
            saúde, que não pertencem a esta plataforma.
          </Text>
          {!confirmingDelete ? (
            <Pressable style={styles.dangerOutlineButton} onPress={() => setConfirmingDelete(true)}>
              <Text style={{ color: theme.colors.danger, fontWeight: "600" }}>Excluir minha conta</Text>
            </Pressable>
          ) : (
            <>
              <Pressable style={styles.dangerButton} onPress={handleDeleteAccount} disabled={isDeleting}>
                {isDeleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "600" }}>Confirmar exclusão</Text>
                )}
              </Pressable>
              <Pressable onPress={() => setConfirmingDelete(false)}>
                <Text style={{ color: theme.colors.textSecondary, textAlign: "center" }}>Cancelar</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 20, gap: 16 },
    card: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, gap: 2 },
    cardText: { fontSize: 13, color: theme.colors.textSecondary },
    outlineButton: { borderWidth: 1, borderColor: `${theme.colors.primary}40`, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    outlineButtonText: { color: theme.colors.primary, fontWeight: "600" },
    dangerOutlineButton: { borderWidth: 1, borderColor: theme.colors.danger, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
    dangerButton: { backgroundColor: theme.colors.danger, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  });
}
