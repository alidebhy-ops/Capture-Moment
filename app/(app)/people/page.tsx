import DataLoadNotice from "@/components/DataLoadNotice";
import FamilyDirectory from "@/components/FamilyDirectory";
import { listFamilyMembers } from "@/lib/family";
import { listMoments } from "@/lib/moments";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const [membersResult, momentsResult] = await Promise.allSettled([
    listFamilyMembers(),
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
      <FamilyDirectory
        initialMembers={membersResult.value}
        moments={momentsResult.status === "fulfilled" ? momentsResult.value : []}
      />
    </div>
  );
}
