import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import type { TenantTheme } from "@rede-is/theme-tokens";
import { useTheme } from "@/theme/theme-provider";
import { withAlpha } from "@/theme/tone";
import { ScreenHeader } from "@/components/screen-header";
import type { MainTabParamList } from "@/navigation/root-navigator";

const ICON_MAP: Record<TenantTheme["customLinks"][number]["icon"], keyof typeof Ionicons.glyphMap> = {
  link: "link-outline",
  globe: "globe-outline",
  phone: "call-outline",
  mail: "mail-outline",
  info: "information-circle-outline",
  megaphone: "megaphone-outline",
  building: "business-outline",
  "file-text": "document-text-outline",
  heart: "heart-outline",
  star: "star-outline",
  "map-pin": "location-outline",
  shield: "shield-checkmark-outline",
};

function LinkRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string | null;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: withAlpha(theme.colors.primary, "1A"),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={20} color={theme.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary }}>{title}</Text>
        {subtitle && (
          <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
    </Pressable>
  );
}

export function MoreServicesScreen() {
  const theme = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const customLinks = theme.customLinks;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader title="Mais Serviços" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 10 }}>
        <LinkRow icon="call-outline" title="Contato" subtitle="Fale com a central de atendimento" onPress={() => navigation.navigate("Contato")} />
        <LinkRow icon="share-social-outline" title="Redes Sociais" subtitle="Siga nossos canais oficiais" onPress={() => navigation.navigate("Social")} />

        {customLinks.length > 0 && (
          <>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: theme.colors.textSecondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                paddingTop: 12,
              }}
            >
              Links úteis
            </Text>
            {customLinks.map((link) => (
              <LinkRow
                key={link.url}
                icon={ICON_MAP[link.icon]}
                title={link.title}
                subtitle={link.subtitle}
                onPress={() => Linking.openURL(link.url).catch(() => {})}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
