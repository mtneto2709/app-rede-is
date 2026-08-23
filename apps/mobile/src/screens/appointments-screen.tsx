import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import type { Appointment } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { Card } from "@/components/screen-list";

const STATUS_LABEL: Record<Appointment["status"], string> = {
  scheduled: "Agendado",
  completed: "Compareceu",
  cancelled: "Cancelado",
  missed: "Não compareceu",
};

type Tab = "futuros" | "passados";

export function AppointmentsScreen() {
  const { data, isLoading, error } = useMeQuery<Appointment[]>("appointments");
  const theme = useTheme();
  const styles = createStyles(theme);
  const [tab, setTab] = useState<Tab>("futuros");

  const statusColor: Record<Appointment["status"], string> = {
    scheduled: theme.colors.success,
    completed: theme.colors.textSecondary,
    cancelled: theme.colors.danger,
    missed: theme.colors.warning,
  };

  const now = Date.now();
  const futuros = data?.filter((a) => new Date(a.scheduledAt).getTime() > now) ?? [];
  const passados = data?.filter((a) => new Date(a.scheduledAt).getTime() <= now) ?? [];
  const items = tab === "futuros" ? futuros : passados;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Agendamentos</Text>
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabButton, tab === "futuros" && styles.tabButtonActive]}
          onPress={() => setTab("futuros")}
        >
          <Text style={[styles.tabLabel, tab === "futuros" && styles.tabLabelActive]}>Futuros</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, tab === "passados" && styles.tabButtonActive]}
          onPress={() => setTab("passados")}
        >
          <Text style={[styles.tabLabel, tab === "passados" && styles.tabLabelActive]}>Passados</Text>
        </Pressable>
      </View>
      {isLoading && <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.primary} />}
      {error && <Text style={styles.error}>{error}</Text>}
      {!isLoading && items.length === 0 && (
        <Text style={styles.empty}>
          {tab === "futuros" ? "Nenhum agendamento futuro no momento." : "Nenhum agendamento passado encontrado."}
        </Text>
      )}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 12 }}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <Text style={{ fontWeight: "600", color: theme.colors.textPrimary, flex: 1 }}>
                {item.professionalName ?? item.specialty ?? "Consulta"}
              </Text>
              <Text style={{ color: statusColor[item.status], fontSize: 11, fontWeight: "700" }}>
                {STATUS_LABEL[item.status]}
              </Text>
            </View>
            {item.specialty && <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{item.specialty}</Text>}
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
              {new Date(item.scheduledAt).toLocaleString("pt-BR")}
            </Text>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    title: { fontSize: 18, fontWeight: "600", color: theme.colors.textPrimary, paddingHorizontal: 20, paddingTop: 16 },
    error: { color: theme.colors.danger, paddingHorizontal: 20 },
    empty: { color: theme.colors.textSecondary, paddingHorizontal: 20 },
    tabBar: {
      flexDirection: "row",
      backgroundColor: "rgba(0,0,0,0.05)",
      borderRadius: 999,
      padding: 4,
      marginHorizontal: 20,
      marginVertical: 12,
    },
    tabButton: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: "center" },
    tabButtonActive: { backgroundColor: theme.colors.surface },
    tabLabel: { fontSize: 13, fontWeight: "600", color: theme.colors.textSecondary },
    tabLabelActive: { color: theme.colors.primary },
  });
}
