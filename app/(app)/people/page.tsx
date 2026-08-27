import DataLoadNotice from "@/components/DataLoadNotice";
import PartnerDirectory from "@/components/PartnerDirectory";
import { listPartners } from "@/lib/partners";
import { listMoments } from "@/lib/moments";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const [membersResult, momentsResult] = await Promise.allSettled([
    listPartners(),
    listMoments(),
  ]);
  if (membersResult.status === "rejected") {
    return (
      <div className="feature-load-page">
        <DataLoadNotice
          title="Profil kita belum dapat dimuat"
          detail={membersResult.reason instanceof Error ? membersResult.reason.message : "Coba muat ulang setelah koneksi penyimpanan pulih."}
        />
      </div>
    );
  }

  return (
    <div className="people-page">
      {momentsResult.status === "rejected" && (
        <DataLoadNotice
          title="Linimasa momen belum lengkap"
          detail="Profil tetap dapat dikelola, tetapi relasi momen sedang tidak tersedia."
        />
      )}
      <PartnerDirectory
        initialMembers={membersResult.value}
        moments={momentsResult.status === "fulfilled" ? momentsResult.value : []}
      />
    </div>
  );
}
