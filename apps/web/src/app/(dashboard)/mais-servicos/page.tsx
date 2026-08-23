import { requireFeature } from "@/lib/require-feature";
import { MoreServicesPageClient } from "./client";

export default async function MoreServicesPage() {
  const theme = await requireFeature("maisServicos");
  return <MoreServicesPageClient customLinks={theme.customLinks} />;
}
