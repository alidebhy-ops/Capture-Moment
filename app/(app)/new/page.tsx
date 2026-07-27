import { Camera } from "lucide-react";
import NewMomentForm from "@/components/NewMomentForm";
import { listFamilyMembers } from "@/lib/family";
import { getPlan } from "@/lib/plans";

export default async function NewMomentPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: planId } = await searchParams;
  const [initialPlan, members] = await Promise.all([
    planId ? getPlan(planId).catch(() => null) : Promise.resolve(null),
    listFamilyMembers().catch(() => []),
  ]);

  return (
    <div className="new-page">
      <header className="page-header-row new-header">
        <div>
          <p className="eyebrow">{initialPlan ? "Rencana yang menjadi nyata" : "Tambahkan ke ruang keluarga"}</p>
          <h1>{initialPlan ? "Ubah rencana menjadi kenangan." : "Abadikan momen baru."}</h1>
          <p>{initialPlan ? "Lengkapi cerita dan media; rencana akan ditandai selesai setelah momen tersimpan." : "Satukan media, tempat, dan cerita sebelum detail kecilnya terlupakan."}</p>
        </div>
        <span className="page-header-icon"><Camera size={23} /></span>
      </header>
      <NewMomentForm initialPlan={initialPlan ?? undefined} members={members} />
    </div>
  );
}
