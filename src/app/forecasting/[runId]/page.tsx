import { redirect } from "next/navigation";

/** Results live inside the /forecasting stepper now; old links keep working. */
export default async function ForecastRunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  redirect(`/forecasting?run=${runId}`);
}
