import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/theme-provider";
import { withAlpha } from "@/theme/tone";
import { ScreenHeader } from "@/components/screen-header";

export function TeleconsultaScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Teleconsulta" />
      <View style={styles.card}>
        <View style={[styles.icon, { backgroundColor: withAlpha(theme.colors.primary, "1A") }]}>
          <Ionicons name="videocam-outline" size={24} color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>Em breve</Text>
        <Text style={styles.text}>
          A teleconsulta ainda está sendo implementada. Em breve você poderá marcar e realizar consultas por vídeo
          diretamente por aqui.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    card: {
      marginHorizontal: 20,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 24,
      alignItems: "center",
      gap: 10,
    },
    icon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary },
    text: { fontSize: 12, color: theme.colors.textSecondary, textAlign: "center" },
  });
}
