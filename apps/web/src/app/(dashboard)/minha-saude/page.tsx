import { requireFeature } from "@/lib/require-feature";
import { HealthSummaryPageClient } from "./client";

export default async function HealthSummaryPage() {
  await requireFeature("minhaSaude");
  return <HealthSummaryPageClient />;
}
