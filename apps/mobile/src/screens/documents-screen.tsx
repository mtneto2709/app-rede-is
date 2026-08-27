import { useState } from "react";
import { Modal, Pressable, Share, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Document } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { withAlpha } from "@/theme/tone";
import { ScreenList, Card } from "@/components/screen-list";

const TYPE_LABEL: Record<Document["type"], string> = {
  prescription: "Receita",
  exam: "Exame",
  certificate: "Atestado",
  referral: "Encaminhamento",
  report: "Relatório",
};

const TYPE_ICON: Record<Document["type"], keyof typeof Ionicons.glyphMap> = {
  prescription: "medical-outline",
  exam: "flask-outline",
  certificate: "ribbon-outline",
  referral: "arrow-redo-outline",
  report: "clipboard-outline",
};

/** Espelha `apps/web/src/lib/document-text.ts` — e-SUS não guarda arquivo pronto, então montamos o texto a partir de `content`. */
function buildDocumentText(doc: Document): string {
  const lines = [doc.title, ""];
  lines.push(`Data: ${new Date(doc.issuedAt).toLocaleDateString("pt-BR")}`);
  if (doc.content?.healthUnitName) lines.push(`Unidade: ${doc.content.healthUnitName}`);
  if (doc.professionalName) {
    lines.push(`Profissional: ${doc.professionalName}${doc.content?.professionalRole ? ` — ${doc.content.professionalRole}` : ""}`);
  }
  if (doc.content?.cid10) lines.push(`CID10: ${doc.content.cid10}`);
  if (doc.content?.daysOff != null) lines.push(`Dias de afastamento: ${doc.content.daysOff}`);
  if (doc.content?.text) lines.push("", doc.content.text);
  return lines.join("\n");
}

function DocumentViewer({ doc, onClose }: { doc: Document; onClose: () => void }) {
  const theme = useTheme();
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: "85%",
            gap: 12,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary, flex: 1, paddingRight: 12 }}>
              {doc.title}
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
              Data: {new Date(doc.issuedAt).toLocaleDateString("pt-BR")}
            </Text>
            {doc.content?.healthUnitName && (
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Unidade: {doc.content.healthUnitName}</Text>
            )}
            {doc.professionalName && (
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                Profissional: {doc.professionalName}
                {doc.content?.professionalRole ? ` — ${doc.content.professionalRole}` : ""}
              </Text>
            )}
            {doc.content?.cid10 && (
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>CID10: {doc.content.cid10}</Text>
            )}
            {doc.content?.daysOff != null && (
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                Dias de afastamento: {doc.content.daysOff}
              </Text>
            )}
          </View>

          {doc.content?.text && (
            <Text
              style={{
                fontSize: 13,
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.background,
                borderRadius: 12,
                padding: 12,
              }}
            >
              {doc.content.text}
            </Text>
          )}

          <Pressable
            onPress={() => Share.share({ message: buildDocumentText(doc), title: doc.title }).catch(() => {})}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderWidth: 1,
              borderColor: "rgba(0,0,0,0.1)",
              borderRadius: 999,
              paddingVertical: 12,
            }}
          >
            <Ionicons name="share-social-outline" size={16} color={theme.colors.textPrimary} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary }}>Compartilhar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function DocumentsScreen() {
  const { data, isLoading, error } = useMeQuery<Document[]>("documents");
  const theme = useTheme();
  const [selected, setSelected] = useState<Document | null>(null);

  const typeColor: Record<Document["type"], string> = {
    prescription: theme.colors.success,
    exam: theme.colors.secondary,
    certificate: theme.colors.warning,
    referral: theme.colors.primary,
    report: theme.colors.primary,
  };

  return (
    <>
      <ScreenList
        title="Documentos"
        data={data}
        isLoading={isLoading}
        error={error}
        emptyLabel="Nenhum documento encontrado."
        keyExtractor={(item) => item.id}
        renderItem={(item) => {
          const color = typeColor[item.type];
          return (
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: withAlpha(color, "1A"),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={TYPE_ICON[item.type]} size={18} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "600", color: theme.colors.textPrimary }}>{item.title}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                    {TYPE_LABEL[item.type]} · {new Date(item.issuedAt).toLocaleDateString("pt-BR")}
                  </Text>
                  {item.professionalName && (
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 1 }}>
                      {item.professionalName}
                    </Text>
                  )}
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => setSelected(item)}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    borderWidth: 1,
                    borderColor: withAlpha(theme.colors.primary, "4D"),
                    borderRadius: 999,
                    paddingVertical: 8,
                  }}
                >
                  <Ionicons name="eye-outline" size={14} color={theme.colors.primary} />
                  <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: "700" }}>Abrir</Text>
                </Pressable>
                <Pressable
                  onPress={() => Share.share({ message: buildDocumentText(item), title: item.title }).catch(() => {})}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    borderWidth: 1,
                    borderColor: "rgba(0,0,0,0.1)",
                    borderRadius: 999,
                    paddingVertical: 8,
                  }}
                >
                  <Ionicons name="share-social-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: "700" }}>Compartilhar</Text>
                </Pressable>
              </View>
            </Card>
          );
        }}
      />
      {selected && <DocumentViewer doc={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
