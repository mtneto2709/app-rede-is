import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Document } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { useTheme } from "@/theme/theme-provider";
import { withAlpha } from "@/theme/tone";
import { ScreenHeader } from "@/components/screen-header";
import { Card } from "@/components/screen-list";

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

const ALL_TYPES = Object.keys(TYPE_LABEL) as Document["type"][];

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
  if (doc.content?.resultProfessionalName) {
    const resultDate = doc.content.resultAt ? new Date(doc.content.resultAt).toLocaleDateString("pt-BR") : "";
    lines.push(`Avaliação: ${doc.content.resultProfessionalName}${resultDate ? ` — ${resultDate}` : ""}`);
  }
  if (doc.content?.medications && doc.content.medications.length > 0) {
    lines.push("");
    for (const med of doc.content.medications) {
      lines.push(med.strength ? `${med.name} ${med.strength}` : med.name);
      for (const extra of [med.dose, med.quantity, med.continuousUse ? "Uso Contínuo" : null, med.duration, med.interrupted, med.reason]) {
        if (extra) lines.push(extra);
      }
      lines.push("");
    }
  } else if (doc.content?.exams && doc.content.exams.length > 0) {
    lines.push("");
    for (const exam of doc.content.exams) {
      lines.push(exam.name);
      if (exam.conferred != null) lines.push(exam.conferred ? "Conferido" : "Aguardando conferência");
      if (exam.requestedAt) lines.push(`Solicitado em ${new Date(exam.requestedAt).toLocaleDateString("pt-BR")}`);
      if (exam.performedAt) lines.push(`Realizado em ${new Date(exam.performedAt).toLocaleDateString("pt-BR")}`);
      if (exam.resultAt) lines.push(`Resultado em ${new Date(exam.resultAt).toLocaleDateString("pt-BR")}`);
      if (exam.result) lines.push(exam.result);
      if (exam.observation) lines.push(exam.observation);
      lines.push("");
    }
  } else if (doc.content?.text) {
    lines.push("", doc.content.text);
  }
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

          <ScrollView contentContainerStyle={{ gap: 12 }}>
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
              {doc.content?.resultProfessionalName && (
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  Avaliação: {doc.content.resultProfessionalName}
                  {doc.content.resultAt ? ` — ${new Date(doc.content.resultAt).toLocaleDateString("pt-BR")}` : ""}
                </Text>
              )}
            </View>

            {doc.content?.medications && doc.content.medications.length > 0 ? (
              <View style={{ gap: 8 }}>
                {doc.content.medications.map((med) => (
                  <Card key={med.id} style={{ borderLeftWidth: 4, borderLeftColor: theme.colors.success, gap: 2 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary }}>
                      {med.name}
                      {med.strength ? <Text style={{ fontWeight: "700", color: "#333333" }}> {med.strength}</Text> : null}
                    </Text>
                    {med.dose && (
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontStyle: "italic" }}>{med.dose}</Text>
                    )}
                    {(med.quantity || med.continuousUse) && (
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{med.quantity}</Text>
                        {med.continuousUse && (
                          <View
                            style={{
                              backgroundColor: withAlpha(theme.colors.success, "1A"),
                              borderRadius: 999,
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.success }}>Uso Contínuo</Text>
                          </View>
                        )}
                      </View>
                    )}
                    {med.duration && <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{med.duration}</Text>}
                    {med.interrupted && <Text style={{ fontSize: 12, color: theme.colors.danger }}>{med.interrupted}</Text>}
                    {med.reason && <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{med.reason}</Text>}
                  </Card>
                ))}
              </View>
            ) : doc.content?.exams && doc.content.exams.length > 0 ? (
              <View style={{ gap: 8 }}>
                {doc.content.exams.map((exam) => (
                  <Card key={exam.id} style={{ borderLeftWidth: 4, borderLeftColor: theme.colors.secondary, gap: 2 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary, flex: 1 }}>
                        {exam.name}
                      </Text>
                      {exam.conferred != null && (
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: exam.conferred ? theme.colors.success : theme.colors.warning,
                          }}
                        >
                          {exam.conferred ? "Conferido" : "Aguardando conferência"}
                        </Text>
                      )}
                    </View>
                    {exam.requestedAt && (
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                        Solicitado em {new Date(exam.requestedAt).toLocaleDateString("pt-BR")}
                      </Text>
                    )}
                    {exam.performedAt && (
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                        Realizado em {new Date(exam.performedAt).toLocaleDateString("pt-BR")}
                      </Text>
                    )}
                    {exam.resultAt && (
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                        Resultado em {new Date(exam.resultAt).toLocaleDateString("pt-BR")}
                      </Text>
                    )}
                    {exam.result && (
                      <Text
                        style={{
                          fontSize: 13,
                          color: theme.colors.textPrimary,
                          backgroundColor: theme.colors.background,
                          borderRadius: 10,
                          padding: 8,
                          marginTop: 2,
                        }}
                      >
                        {exam.result}
                      </Text>
                    )}
                    {exam.observation && (
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{exam.observation}</Text>
                    )}
                  </Card>
                ))}
              </View>
            ) : (
              doc.content?.text && (
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
              )
            )}
          </ScrollView>

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
  const [activeTypes, setActiveTypes] = useState<Set<Document["type"]>>(new Set(ALL_TYPES));

  const typeColor: Record<Document["type"], string> = {
    prescription: theme.colors.success,
    exam: theme.colors.secondary,
    certificate: theme.colors.warning,
    referral: theme.colors.primary,
    report: theme.colors.primary,
  };

  function toggleType(type: Document["type"]) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const visibleDocs = data?.filter((doc) => activeTypes.has(doc.type)) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader title="Documentos" />
      {isLoading && <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.primary} />}
      {error && <Text style={{ color: theme.colors.danger, paddingHorizontal: 20 }}>{error}</Text>}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 12 }}>
        <Card style={{ borderLeftWidth: 4, borderLeftColor: theme.colors.warning, flexDirection: "row", gap: 10 }}>
          <Ionicons name="alert-circle-outline" size={20} color={theme.colors.warning} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary }}>Atenção</Text>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
              As informações abaixo trazem os registros de documentos emitidos pelo sistema, com todas as
              informações registradas. Estes não substituem os documentos originais que foram entregues assinados
              pelo profissional que emitiu.
            </Text>
          </View>
        </Card>

        {data && data.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ALL_TYPES.map((type) => {
              const active = activeTypes.has(type);
              const color = typeColor[type];
              return (
                <Pressable
                  key={type}
                  onPress={() => toggleType(type)}
                  style={{
                    borderWidth: 1.5,
                    borderColor: color,
                    backgroundColor: active ? color : theme.colors.background,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "#FFFFFF" : color }}>
                    {TYPE_LABEL[type]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {!isLoading && data?.length === 0 && (
          <Text style={{ color: theme.colors.textSecondary }}>Nenhum documento encontrado.</Text>
        )}
        {!isLoading && data && data.length > 0 && visibleDocs.length === 0 && (
          <Text style={{ color: theme.colors.textSecondary }}>Nenhum documento para os filtros selecionados.</Text>
        )}

        {visibleDocs.map((item) => {
          const color = typeColor[item.type];
          return (
            <Card key={item.id} style={{ gap: 10 }}>
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
                  {item.type === "exam" && (
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 1 }}>
                      {item.content?.resultProfessionalName
                        ? `Avaliação: ${item.content.resultProfessionalName} · ${
                            item.content.resultAt ? new Date(item.content.resultAt).toLocaleDateString("pt-BR") : ""
                          }`
                        : "Aguardando avaliação"}
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
        })}
      </ScrollView>
      {selected && <DocumentViewer doc={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}
