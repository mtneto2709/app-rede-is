import { Linking, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { HealthUnit } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { ScreenList, Card } from "@/components/screen-list";

const TYPE_LABEL: Record<HealthUnit["type"], string> = {
  ubs: "UBS",
  hospital: "Hospital",
  clinic: "Clínica",
  laboratory: "Laboratório",
  other: "Outro",
};

/** Abre o app de mapas do aparelho (Google Maps/Apple Maps/Waze — o que estiver configurado como padrão). */
function openInMaps(unit: HealthUnit) {
  const query =
    unit.latitude != null && unit.longitude != null
      ? `${unit.latitude},${unit.longitude}`
      : [unit.name, unit.address].filter(Boolean).join(", ");
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  Linking.openURL(url).catch(() => {});
}

export function HealthUnitsScreen() {
  const { data, isLoading, error } = useMeQuery<HealthUnit[]>("health-units");
  const theme = useTheme();

  return (
    <ScreenList
      title="Unidades de Saúde"
      data={data}
      isLoading={isLoading}
      error={error}
      emptyLabel="Nenhuma unidade encontrada."
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <Card>
          <Text style={{ fontWeight: "600", color: theme.colors.textPrimary }}>{item.name}</Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
            {TYPE_LABEL[item.type]}
            {item.address ? ` · ${item.address}` : ""}
          </Text>
          {item.phone && <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{item.phone}</Text>}
          <Pressable
            onPress={() => openInMaps(item)}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}
          >
            <Ionicons name="map-outline" size={14} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: "600" }}>Abrir no mapa</Text>
          </Pressable>
        </Card>
      )}
    />
  );
}
