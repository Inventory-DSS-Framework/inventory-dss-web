import { redirect } from "next/navigation";

/** Merged into the single /forecasting page (step 4 · "Reportes"). */
export default function ReportsPage() {
  redirect("/forecasting?vista=reportes");
}
