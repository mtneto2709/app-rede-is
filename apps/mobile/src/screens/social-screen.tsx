import { Linking, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/theme-provider";
import { withAlpha } from "@/theme/tone";

/**
 * Cores das próprias redes sociais (identidade da marca de terceiros, não
 * do tenant) — espelha `apps/web/src/app/(dashboard)/social/page.tsx`.
 */
const PLATFORM_COLOR: Record<string, string> = {
  facebook: "#1877F2",
  instagram: "#E1306C",
  twitter: "#1DA1F2",
  youtube: "#FF0000",
  linkedin: "#0A66C2",
};

const PLATFORM_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  facebook: "logo-facebook",
  instagram: "logo-instagram",
  twitter: "logo-twitter",
  youtube: "logo-youtube",
  linkedin: "logo-linkedin",
};

export function SocialScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Redes Sociais</Text>
      {theme.socialLinks.length === 0 && (
        <Text style={styles.empty}>Nenhuma rede social cadastrada.</Text>
      )}
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        {theme.socialLinks.map((link) => {
          const color = PLATFORM_COLOR[link.platform] ?? theme.colors.textSecondary;
          const icon = PLATFORM_ICON[link.platform] ?? "link-outline";
          return (
            <Pressable
              key={link.platform}
              style={styles.card}
              onPress={() => Linking.openURL(link.url).catch(() => {})}
            >
              <View style={[styles.icon, { backgroundColor: withAlpha(color, "1A") }]}>
                <Ionicons name={icon} size={20} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{link.label}</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>
                  {link.url}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    title: { fontSize: 18, fontWeight: "600", color: theme.colors.textPrimary, paddingHorizontal: 20, paddingVertical: 16 },
    empty: { color: theme.colors.textSecondary, paddingHorizontal: 20 },
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
    icon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    cardTitle: { fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary },
    cardSubtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  });
}
