import { requireFeature } from "@/lib/require-feature";
import { HealthUnitsPageClient } from "./client";

export default async function HealthUnitsPage() {
  await requireFeature("unidades");
  return <HealthUnitsPageClient />;
}
