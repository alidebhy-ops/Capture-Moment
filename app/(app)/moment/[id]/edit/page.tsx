import Link from "next/link";
import { ArrowLeft, PencilLine } from "lucide-react";
import { notFound } from "next/navigation";
import NewMomentForm from "@/components/NewMomentForm";
import { listPartners } from "@/lib/partners";
import { getMoment } from "@/lib/moments";

export const dynamic = "force-dynamic";

export default async function EditMomentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [moment, members] = await Promise.all([
    getMoment(id),
    listPartners().catch(() => []),
  ]);
  if (!moment) notFound();

  return (
    <div className="new-page">
      <Link href={`/moment/${moment.id}`} className="back-link edit-back-link">
        <ArrowLeft size={16} /> Kembali ke cerita
      </Link>
      <header className="page-header-row new-header">
        <div>
          <p className="eyebrow">Memory Workshop</p>
          <h1>Rapikan momen.</h1>
          <p>Perbarui cerita, orang, lokasi, atau susunan media tanpa kehilangan kenangannya.</p>
        </div>
        <span className="page-header-icon"><PencilLine size={23} /></span>
      </header>
      <NewMomentForm initialMoment={moment} members={members} />
    </div>
  );
}
