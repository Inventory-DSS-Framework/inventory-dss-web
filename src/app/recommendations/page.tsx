import { redirect } from "next/navigation";

/** Merged into the single /forecasting page (step 4 · "Qué comprar"). */
export default function RecommendationsPage() {
  redirect("/forecasting?vista=comprar");
}
