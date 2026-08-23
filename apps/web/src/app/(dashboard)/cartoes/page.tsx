import { requireFeature } from "@/lib/require-feature";
import { CardsPageClient } from "./client";

export default async function CardsPage() {
  const theme = await requireFeature("cartoes");
  return <CardsPageClient cards={theme.cards} />;
}
