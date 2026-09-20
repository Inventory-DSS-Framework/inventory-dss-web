import { redirect } from "next/navigation";

/** Merged into the single /forecasting page (step 4 · "Mis números"). */
export default function KpisPage() {
  redirect("/forecasting?vista=numeros");
}
