import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
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

/**
 * Mesmo diretório de serviços da home do web (dashboard-home.tsx) — como o
 * mobile não tem uma tela própria pra alguns desses ainda (Teleconsulta,
 * Meus Cartões, Minha Saúde, Mais Serviços), eles apontam pra uma aba
 * existente como placeholder, igual o web já faz.
 */
const SERVICES = [
  { name: "Agendamentos", icon: "calendar-outline", tab: "Agendamentos" },
  { name: "Teleconsulta", icon: "videocam-outline", tab: "Agendamentos" },
  { name: "Atendimentos", icon: "medkit-outline", tab: "Atendimentos" },
  { name: "Vacinação", icon: "medical-outline", tab: "Vacinacao" },
  { name: "Meus Cartões", icon: "card-outline", tab: "Perfil" },
  { name: "Unidades", icon: "business-outline", tab: "Unidades" },
  { name: "Minha Saúde", icon: "heart-outline", tab: "Documentos" },
  { name: "Mais Serviços", icon: "ellipsis-horizontal", tab: "Perfil" },
] as const satisfies { name: string; icon: keyof typeof Ionicons.glyphMap; tab: keyof MainTabParamList }[];

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

        <View style={styles.servicesGrid}>
          {SERVICES.map((service) => (
            <Pressable
              key={service.name}
              style={styles.serviceItem}
              onPress={() => navigation.navigate(service.tab)}
            >
              <View style={styles.serviceIcon}>
                <Ionicons name={service.icon} size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.serviceLabel}>{service.name}</Text>
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
    servicesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 12,
      paddingTop: 4,
    },
    serviceItem: { width: "25%", alignItems: "center", paddingVertical: 12, gap: 6 },
    serviceIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    serviceLabel: { fontSize: 10, color: theme.colors.textSecondary, textAlign: "center" },
  });
}
