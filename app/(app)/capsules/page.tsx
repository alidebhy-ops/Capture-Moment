import DataLoadNotice from "@/components/DataLoadNotice";
import TimeCapsuleVault from "@/components/TimeCapsuleVault";
import { listTimeCapsules } from "@/lib/capsules";
import type { TimeCapsule } from "@/lib/experience-types";

export const dynamic = "force-dynamic";

export default async function CapsulesPage() {
  let capsules: TimeCapsule[] = [];
  let loadError = "";
  try {
    capsules = await listTimeCapsules();
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Coba muat ulang setelah koneksi penyimpanan pulih.";
  }

  if (loadError) {
    return (
      <div className="feature-load-page">
        <DataLoadNotice
          title="Brankas kapsul belum dapat dibuka"
          detail={loadError}
        />
      </div>
    );
  }

  return (
    <TimeCapsuleVault
      initialCapsules={capsules}
      nowIso={new Date().toISOString()}
    />
  );
}
