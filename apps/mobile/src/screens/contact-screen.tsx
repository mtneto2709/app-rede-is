import { Linking, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/theme-provider";
import { withAlpha } from "@/theme/tone";
import { ScreenHeader } from "@/components/screen-header";

export function ContactScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { phone, whatsapp, email } = theme.contactSupport;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Entre em Contato" />
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        {phone && (
          <View style={styles.card}>
            <View style={[styles.icon, { backgroundColor: withAlpha(theme.colors.primary, "1A") }]}>
              <Ionicons name="call-outline" size={18} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.cardTitle}>Central de Atendimento</Text>
              <Text style={styles.cardSubtitle}>{phone}</Text>
            </View>
          </View>
        )}
        {whatsapp && (
          <Pressable style={styles.card} onPress={() => Linking.openURL(`https://wa.me/${whatsapp}`).catch(() => {})}>
            <View style={[styles.icon, { backgroundColor: withAlpha(theme.colors.success, "1A") }]}>
              <Ionicons name="logo-whatsapp" size={18} color={theme.colors.success} />
            </View>
            <View>
              <Text style={styles.cardTitle}>WhatsApp</Text>
              <Text style={styles.cardSubtitle}>{whatsapp}</Text>
            </View>
          </Pressable>
        )}
        {email && (
          <Pressable style={styles.card} onPress={() => Linking.openURL(`mailto:${email}`).catch(() => {})}>
            <View style={[styles.icon, { backgroundColor: withAlpha(theme.colors.secondary, "1A") }]}>
              <Ionicons name="mail-outline" size={18} color={theme.colors.secondary} />
            </View>
            <View>
              <Text style={styles.cardTitle}>E-mail</Text>
              <Text style={styles.cardSubtitle}>{email}</Text>
            </View>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 6,
    },
    icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    cardTitle: { fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary },
    cardSubtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  });
}
