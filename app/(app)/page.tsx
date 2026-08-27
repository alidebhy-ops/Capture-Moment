import { describeGoogleError } from "@/lib/google-errors";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  CalendarDays,
  CalendarHeart,
  Camera,
  CircleCheckBig,
  FolderHeart,
  History,
  Inbox,
  ListTodo,
  LockKeyhole,
  MapPinned,
  PiggyBank,
  Plus,
  Sparkles,
  UsersRound,
} from "lucide-react";
import MomentExplorer from "@/components/MomentExplorer";
import { formatDateID, todayISOInTimeZone } from "@/lib/format";
import { coverSrc } from "@/lib/media";
import { listMoments, type Moment } from "@/lib/moments";
import { listPlans } from "@/lib/plans";
import type { Plan } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ koleksi?: string }> }) {
  const { koleksi } = await searchParams;
  let moments: Moment[] = [];
  let plans: Plan[] = [];
  let error = "";
  try {
    [moments, plans] = await Promise.all([
      listMoments(),
      listPlans().catch(() => []),
    ]);
  } catch (cause) {
    error = describeGoogleError(cause);
  }

  if (error) {
    return (
      <div className="state-card">
        <Camera size={28} />
        <h1>Ruang kenangan belum terhubung</h1>
        <p>{error}</p>
        <Link href="/new" className="primary-button">Coba tambah momen</Link>
      </div>
    );
  }

  const featured = moments[0];
  const today = new Date();
  const todayISO = todayISOInTimeZone();
  const todayKey = todayISO.slice(5);
  const currentYear = Number(todayISO.slice(0, 4));
  const onThisDay = moments.find(
    (moment) =>
      moment.date.slice(5) === todayKey &&
      moment.date.slice(0, 4) !== String(currentYear)
  );
  const resurfaced =
    onThisDay ||
    moments.find((moment) => moment.favorite && moment.id !== featured?.id) ||
    moments[1];
  const welcomeDate = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(today);
  const collectionCount = new Set(moments.map((moment) => moment.collection)).size;
  const locationCount = new Set(moments.map((moment) => moment.locationName).filter(Boolean)).size;
  const mediaCount = moments.reduce((total, moment) => total + moment.media.length, 0);
  const upcomingPlan = plans
    .filter((plan) => plan.status !== "completed")
    .sort((a, b) => {
      if (!a.targetDate) return 1;
      if (!b.targetDate) return -1;
      return a.targetDate.localeCompare(b.targetDate);
    })[0];
  const planChecklistDone = upcomingPlan?.checklist.filter((item) => item.done).length ?? 0;
  const planBudgetProgress = upcomingPlan?.estimatedBudget
    ? Math.min(100, Math.round((upcomingPlan.savedAmount / upcomingPlan.estimatedBudget) * 100))
    : 0;

  return (
    <div className="home-page">
      <header className="welcome-row">
        <div>
          <p className="eyebrow">{welcomeDate}</p>
          <h1>Selamat datang kembali.</h1>
          <p>Ada banyak cerita kecil yang layak diingat selamanya.</p>
        </div>
        <Link href="/new" className="primary-button desktop-quick-add">
          <Plus size={18} /> Abadikan momen
        </Link>
      </header>

      {featured && (
        <section className="hero-grid" aria-label="Sorotan kenangan">
          <Link href={`/moment/${featured.id}`} className="featured-memory">
            {coverSrc(featured) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverSrc(featured)} alt="" />
            )}
            <span className="hero-gradient" />
            <div className="featured-copy">
              <span className="soft-pill"><Sparkles size={14} /> Momen terbaru</span>
              <h2>{featured.title}</h2>
              <p>{featured.locationName} · {featured.media.length} media</p>
              <span className="text-link">Baca ceritanya <ArrowRight size={16} /></span>
            </div>
          </Link>

          <div className="hero-side">
            {resurfaced && (
              <Link href={`/moment/${resurfaced.id}`} className="resurfaced-card">
                <div className="resurfaced-icon"><CalendarHeart size={21} /></div>
                <div>
                  <span>{onThisDay ? "Hari ini di masa lalu" : "Buka kembali kenangan"}</span>
                  <h3>{resurfaced.title}</h3>
                  <p>{onThisDay ? `${currentYear - Number(onThisDay.date.slice(0, 4))} tahun lalu, cerita ini dimulai.` : "Kenangan favoritmu menunggu untuk diceritakan lagi."}</p>
                </div>
                <ArrowRight size={18} className="resurfaced-arrow" />
              </Link>
            )}
            <div className="stat-grid">
              <div><span><Camera size={18} /></span><strong>{mediaCount}</strong><p>Foto &amp; video</p></div>
              <div><span><FolderHeart size={18} /></span><strong>{collectionCount}</strong><p>Koleksi</p></div>
              <div><span><MapPinned size={18} /></span><strong>{locationCount}</strong><p>Tempat</p></div>
            </div>
          </div>
        </section>
      )}

      {upcomingPlan && (
        <section className="plan-spotlight" aria-label="Rencana terdekat">
          <div className="plan-spotlight-icon"><ListTodo size={23} /></div>
          <div className="plan-spotlight-copy">
            <p className="eyebrow">Rencana terdekat</p>
            <h2>{upcomingPlan.title}</h2>
            <div className="plan-spotlight-meta">
              {upcomingPlan.targetDate && <span><CalendarDays size={14} /> {formatDateID(upcomingPlan.targetDate)}</span>}
              <span><CircleCheckBig size={14} /> {planChecklistDone}/{upcomingPlan.checklist.length} persiapan</span>
              {upcomingPlan.estimatedBudget > 0 && <span><PiggyBank size={14} /> Tabungan {planBudgetProgress}%</span>}
            </div>
          </div>
          <div className="plan-spotlight-progress" aria-label={`Kesiapan tabungan ${planBudgetProgress}%`}>
            <span style={{ width: `${planBudgetProgress}%` }} />
          </div>
          <Link href="/plans" className="secondary-button">Buka planner <ArrowRight size={16} /></Link>
        </section>
      )}

      <section className="feature-launcher" aria-labelledby="feature-launcher-title">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Ruang kita</p>
            <h2 id="feature-launcher-title">Lebih dari sekadar album</h2>
          </div>
          <p className="feature-launcher-intro">
            Hidupkan kembali cerita, siapkan hari berikutnya, dan rawat arsip kita berdua.
          </p>
        </div>
        <div className="feature-launcher-grid">
          <Link href="/memories" className="feature-launcher-card feature-launcher-card-warm">
            <span><History size={20} /></span>
            <div>
              <strong>Kilas balik</strong>
              <p>Kenangan hari ini, recap, dan pilihan acak.</p>
            </div>
            <ArrowRight size={17} />
          </Link>
          <Link href="/calendar" className="feature-launcher-card">
            <span><CalendarDays size={20} /></span>
            <div>
              <strong>Kalender kita</strong>
              <p>Momen, rencana, dan kapsul dalam satu kalender.</p>
            </div>
            <ArrowRight size={17} />
          </Link>
          <Link href="/people" className="feature-launcher-card">
            <span><UsersRound size={20} /></span>
            <div>
              <strong>People Timeline</strong>
              <p>Lihat kisah dari sudut setiap profil.</p>
            </div>
            <ArrowRight size={17} />
          </Link>
          <Link href="/capsules" className="feature-launcher-card">
            <span><LockKeyhole size={20} /></span>
            <div>
              <strong>Kapsul waktu</strong>
              <p>Tulis pesan yang baru terbuka pada waktunya.</p>
            </div>
            <ArrowRight size={17} />
          </Link>
          <Link href="/inbox" className="feature-launcher-card">
            <span><Inbox size={20} /></span>
            <div>
              <strong>Smart Inbox</strong>
              <p>Kelompokkan banyak media sebelum menjadi cerita.</p>
            </div>
            <ArrowRight size={17} />
          </Link>
          <Link href="/archive" className="feature-launcher-card">
            <span><Archive size={20} /></span>
            <div>
              <strong>Arsip &amp; photobook</strong>
              <p>Backup, pulihkan momen, dan siapkan album cetak.</p>
            </div>
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <MomentExplorer moments={moments} initialCollection={koleksi || "Semua"} />
    </div>
  );
}
