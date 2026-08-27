import DataLoadNotice from "@/components/DataLoadNotice";
import SharedCalendar from "@/components/SharedCalendar";
import { listTimeCapsules } from "@/lib/capsules";
import type { TimeCapsule } from "@/lib/experience-types";
import { todayISOInTimeZone } from "@/lib/format";
import { listMoments } from "@/lib/moments";
import { listPlans } from "@/lib/plans";
import type { Moment, Plan } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [momentsResult, plansResult, capsulesResult] = await Promise.allSettled([
    listMoments(),
    listPlans(),
    listTimeCapsules(),
  ]);
  const moments = momentsResult.status === "fulfilled" ? momentsResult.value : [] as Moment[];
  const plans = plansResult.status === "fulfilled" ? plansResult.value : [] as Plan[];
  const capsules = capsulesResult.status === "fulfilled" ? capsulesResult.value : [] as TimeCapsule[];
  const failedLabels = [
    momentsResult.status === "rejected" ? "momen" : "",
    plansResult.status === "rejected" ? "rencana" : "",
    capsulesResult.status === "rejected" ? "kapsul" : "",
  ].filter(Boolean);

  return (
    <>
      {failedLabels.length > 0 && (
        <DataLoadNotice
          title="Sebagian kalender belum dapat dimuat"
          detail={`Data ${failedLabels.join(", ")} sedang tidak tersedia. Agenda lain tetap dapat dijelajahi.`}
        />
      )}
      <SharedCalendar
        moments={moments}
        plans={plans}
        capsules={capsules}
        nowIso={todayISOInTimeZone()}
      />
    </>
  );
}
