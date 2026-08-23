import { requireFeature } from "@/lib/require-feature";
import { VaccinationPageClient } from "./client";

export default async function VaccinationPage() {
  await requireFeature("vacinacao");
  return <VaccinationPageClient />;
}
