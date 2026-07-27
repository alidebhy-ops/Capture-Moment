import PlanBoard from "@/components/PlanBoard";
import { listPlans } from "@/lib/plans";
import type { Plan } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const plans = await listPlans().catch(() => [] as Plan[]);

  return <PlanBoard initialPlans={plans} />;
}
