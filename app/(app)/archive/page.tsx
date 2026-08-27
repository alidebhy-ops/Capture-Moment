import type { Metadata } from "next";
import ArchiveCenter from "@/components/ArchiveCenter";
import { listPartners } from "@/lib/partners";
import { listAllMoments } from "@/lib/moments";
import { listPlans } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Arsip & Backup",
  description:
    "Pantau kesehatan arsip, unduh backup data, dan pulihkan momen kita.",
};

export const dynamic = "force-dynamic";

function resultError(
  result: PromiseRejectedResult,
  label: string
): string {
  return result.reason instanceof Error
    ? `${label}: ${result.reason.message}`
    : `${label} belum dapat dimuat.`;
}

export default async function ArchivePage() {
  const [momentsResult, plansResult, membersResult] =
    await Promise.allSettled([
      listAllMoments(),
      listPlans(),
      listPartners(),
    ]);

  const errors = [
    ...(momentsResult.status === "rejected"
      ? [resultError(momentsResult, "Momen")]
      : []),
    ...(plansResult.status === "rejected"
      ? [resultError(plansResult, "Rencana")]
      : []),
    ...(membersResult.status === "rejected"
      ? [resultError(membersResult, "Profil kita")]
      : []),
  ];

  return (
    <ArchiveCenter
      initialMoments={
        momentsResult.status === "fulfilled" ? momentsResult.value : []
      }
      plans={plansResult.status === "fulfilled" ? plansResult.value : []}
      members={
        membersResult.status === "fulfilled" ? membersResult.value : []
      }
      dataError={errors.length ? errors.join(" ") : undefined}
    />
  );
}
