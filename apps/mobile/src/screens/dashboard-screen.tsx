import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import type { DashboardStats, PatientProfileSummary } from "@rede-is/shared-types";
import type { TenantTheme } from "@rede-is/theme-tokens";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { toneColorAt, withAlpha } from "@/theme/tone";
import type { MainTabParamList } from "@/navigation/root-navigator";

type Feature = keyof TenantTheme["features"];

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

const QUICK_ACCESS = [
  { key: "attendancesCount", label: "Atendimentos", tab: "Atendimentos", icon: "medkit-outline", feature: "atendimentos" },
  { key: "appointmentsCount", label: "Agendamentos", tab: "Agendamentos", icon: "calendar-outline", feature: "agendamentos" },
  { key: "alertsCount", label: "Alertas", tab: "Alertas", icon: "notifications-outline", feature: null },
  { key: "documentsCount", label: "Documentos", tab: "Documentos", icon: "document-text-outline", feature: null },
] as const satisfies {
  key: keyof DashboardStats;
  label: string;
  tab: keyof MainTabParamList;
  icon: keyof typeof Ionicons.glyphMap;
  feature: Feature | null;
}[];

/** Mesmo diretório de serviços da home do web (dashboard-home.tsx). */
const SERVICES = [
  { name: "Agendamentos", icon: "calendar-outline", tab: "Agendamentos", feature: "agendamentos" },
  { name: "Teleconsulta", icon: "videocam-outline", tab: "Teleconsulta", feature: "teleconsulta" },
  { name: "Atendimentos", icon: "medkit-outline", tab: "Atendimentos", feature: "atendimentos" },
  { name: "Vacinação", icon: "medical-outline", tab: "Vacinacao", feature: "vacinacao" },
  { name: "Meus Cartões", icon: "card-outline", tab: "Cartoes", feature: "cartoes" },
  { name: "Unidades", icon: "business-outline", tab: "Unidades", feature: "unidades" },
  { name: "Minha Saúde", icon: "heart-outline", tab: "MinhaSaude", feature: "minhaSaude" },
  { name: "Mais Serviços", icon: "ellipsis-horizontal", tab: "MaisServicos", feature: "maisServicos" },
] as const satisfies { name: string; icon: keyof typeof Ionicons.glyphMap; tab: keyof MainTabParamList; feature: Feature }[];

export function DashboardScreen() {
  const { data: stats } = useMeQuery<DashboardStats>("dashboard");
  const { data: profile } = useMeQuery<PatientProfileSummary>("profile");
  const theme = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const styles = createStyles(theme);

  const quickAccess = QUICK_ACCESS.filter((item) => item.feature === null || theme.features[item.feature]);
  const services = SERVICES.filter((service) => theme.features[service.feature]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Image source={{ uri: theme.branding.logoLightUrl }} style={styles.logo} />
            <View style={{ flex: 1 }}>
              <Text style={styles.headerSubtitle}>Bem-vindo(a)</Text>
              <Text style={styles.headerTitle}>{profile?.name ? firstName(profile.name) : theme.branding.appName}</Text>
            </View>
            <Pressable style={styles.settingsButton} onPress={() => navigation.navigate("Perfil")}>
              <Ionicons name="settings-outline" size={20} color={theme.colors.primaryForeground} />
            </Pressable>
          </View>
        </View>

        <View style={styles.grid}>
          {quickAccess.map((item, index) => {
            const color = toneColorAt(theme, index);
            return (
              <Pressable key={item.key} style={styles.gridItem} onPress={() => navigation.navigate(item.tab)}>
                <View style={styles.gridTopRow}>
                  <View style={[styles.gridIcon, { backgroundColor: withAlpha(color, "1A") }]}>
                    <Ionicons name={item.icon} size={18} color={color} />
                  </View>
                  <Text style={[styles.gridCount, { color }]}>{String(stats?.[item.key] ?? 0).padStart(2, "0")}</Text>
                </View>
                <Text style={styles.gridLabel}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.servicesGrid}>
          {services.map((service, index) => {
            const color = toneColorAt(theme, index);
            return (
              <Pressable
                key={service.name}
                style={styles.serviceItem}
                onPress={() => navigation.navigate(service.tab)}
              >
                <View style={[styles.serviceIcon, { backgroundColor: withAlpha(color, "1A") }]}>
                  <Ionicons name={service.icon} size={20} color={color} />
                </View>
                <Text style={styles.serviceLabel}>{service.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Pressable style={styles.footerButton} onPress={() => navigation.navigate("Contato")}>
            <Ionicons name="call-outline" size={16} color={theme.colors.textPrimary} />
            <Text style={styles.footerButtonText}>Contato</Text>
          </Pressable>
          <Pressable style={styles.footerButton} onPress={() => navigation.navigate("Social")}>
            <Ionicons name="share-social-outline" size={16} color={theme.colors.textPrimary} />
            <Text style={styles.footerButtonText}>Redes Sociais</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 24,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    logo: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff" },
    headerSubtitle: { color: theme.colors.primaryForeground, opacity: 0.85, fontSize: 12 },
    headerTitle: { color: theme.colors.primaryForeground, fontSize: 18, fontWeight: "600" },
    settingsButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 20 },
    gridItem: {
      width: "47%",
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      gap: 6,
    },
    gridTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
    gridIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    gridCount: { fontSize: 30, fontWeight: "800", lineHeight: 34 },
    gridLabel: { fontSize: 12, color: theme.colors.textSecondary },
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
      alignItems: "center",
      justifyContent: "center",
    },
    serviceLabel: { fontSize: 10, color: theme.colors.textSecondary, textAlign: "center" },
    footer: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 8 },
    footerButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.1)",
      borderRadius: 999,
      paddingVertical: 12,
    },
    footerButtonText: { fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary },
  });
}
