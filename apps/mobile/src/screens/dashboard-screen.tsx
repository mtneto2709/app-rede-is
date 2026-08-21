import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { DashboardStats } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import type { MainTabParamList } from "@/navigation/root-navigator";

const QUICK_ACCESS = [
  { key: "attendancesCount", label: "Atendimentos", tab: "Atendimentos" },
  { key: "appointmentsCount", label: "Agendamentos", tab: "Agendamentos" },
  { key: "alertsCount", label: "Alertas", tab: "Alertas" },
  { key: "documentsCount", label: "Documentos", tab: "Documentos" },
] as const;

export function DashboardScreen() {
  const { data: stats } = useMeQuery<DashboardStats>("dashboard");
  const theme = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <Image source={{ uri: theme.branding.logoLightUrl }} style={styles.logo} />
          <View>
            <Text style={styles.headerSubtitle}>Bem-vindo(a)</Text>
            <Text style={styles.headerTitle}>{theme.branding.appName}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          {QUICK_ACCESS.map((item) => (
            <Pressable key={item.key} style={styles.gridItem} onPress={() => navigation.navigate(item.tab)}>
              <Text style={styles.gridCount}>{String(stats?.[item.key] ?? 0).padStart(2, "0")}</Text>
              <Text style={styles.gridLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: theme.colors.primary,
      padding: 24,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    logo: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff" },
    headerSubtitle: { color: theme.colors.primaryForeground, opacity: 0.85, fontSize: 12 },
    headerTitle: { color: theme.colors.primaryForeground, fontSize: 18, fontWeight: "600" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 20 },
    gridItem: {
      width: "47%",
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      alignItems: "center",
    },
    gridCount: { fontSize: 28, fontWeight: "800", color: theme.colors.primary },
    gridLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  });
}
