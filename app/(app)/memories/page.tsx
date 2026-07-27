import DataLoadNotice from "@/components/DataLoadNotice";
import MemoryRewind from "@/components/MemoryRewind";
import { todayISOInTimeZone } from "@/lib/format";
import { listMoments } from "@/lib/moments";
import type { Moment } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MemoriesPage() {
  let moments: Moment[] = [];
  let loadError = "";
  try {
    moments = await listMoments();
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
          title="Kilas balik belum dapat dimuat"
          detail={loadError}
        />
      </div>
    );
  }

  return (
    <MemoryRewind
      moments={moments}
      nowIso={todayISOInTimeZone()}
    />
  );
}
