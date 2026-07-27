"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CakeSlice,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Compass,
  Edit3,
  Flag,
  Heart,
  HouseHeart,
  ListChecks,
  LoaderCircle,
  MapPin,
  NotebookTabs,
  Plane,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
} from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { formatDateID } from "@/lib/format";
import type {
  Plan,
  PlanCategory,
  PlanChecklistItem,
  PlanPriority,
  PlanStatus,
} from "@/lib/types";

const STATUS_OPTIONS: Array<{ value: PlanStatus; label: string; shortLabel: string }> = [
  { value: "wishlist", label: "Masih di wishlist", shortLabel: "Wishlist" },
  { value: "planning", label: "Sedang disiapkan", shortLabel: "Disiapkan" },
  { value: "ready", label: "Siap diwujudkan", shortLabel: "Siap" },
  { value: "completed", label: "Sudah terwujud", shortLabel: "Selesai" },
];

const CATEGORY_OPTIONS: Array<{ value: PlanCategory; label: string }> = [
  { value: "Perjalanan", label: "Perjalanan" },
  { value: "Perayaan", label: "Perayaan" },
  { value: "Keluarga", label: "Keluarga" },
  { value: "Proyek", label: "Proyek kenangan" },
  { value: "Kuliner", label: "Kuliner" },
];

const PRIORITY_OPTIONS: Array<{ value: PlanPriority; label: string }> = [
  { value: "low", label: "Santai" },
  { value: "medium", label: "Penting" },
  { value: "high", label: "Prioritas utama" },
];

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

type PlanFormState = {
  title: string;
  description: string;
  category: PlanCategory;
  status: PlanStatus;
  priority: PlanPriority;
  targetDate: string;
  locationName: string;
  estimatedBudget: string;
  savedAmount: string;
  participants: string;
  checklist: string;
  notes: string;
};

type Notice = { kind: "success" | "error"; message: string } | null;

const EMPTY_FORM: PlanFormState = {
  title: "",
  description: "",
  category: "Perjalanan",
  status: "wishlist",
  priority: "medium",
  targetDate: "",
  locationName: "",
  estimatedBudget: "",
  savedAmount: "",
  participants: "",
  checklist: "",
  notes: "",
};

function statusLabel(status: PlanStatus) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.shortLabel ?? status;
}

function priorityLabel(priority: PlanPriority) {
  return PRIORITY_OPTIONS.find((item) => item.value === priority)?.label ?? priority;
}

function progressPercent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

function checklistPercent(items: PlanChecklistItem[]) {
  return progressPercent(items.filter((item) => item.done).length, items.length);
}

function readinessScore(plan: Plan) {
  if (plan.status === "completed") return 100;
  const checklistScore = plan.checklist.length ? checklistPercent(plan.checklist) * 0.5 : 10;
  const savingScore = plan.estimatedBudget
    ? progressPercent(plan.savedAmount, plan.estimatedBudget) * 0.3
    : 20;
  const detailScore = [plan.targetDate, plan.locationName, plan.participants.length > 0].filter(Boolean).length * (20 / 3);
  return Math.min(99, Math.round(checklistScore + savingScore + detailScore));
}

function daysUntil(value: string) {
  if (!value) return null;
  const target = new Date(`${value}T12:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function targetHint(plan: Plan) {
  if (plan.status === "completed") return "Sudah menjadi kenangan";
  const days = daysUntil(plan.targetDate);
  if (days === null) return "Tanggal belum ditentukan";
  if (days < 0) return `${Math.abs(days)} hari melewati target`;
  if (days === 0) return "Target hari ini";
  if (days === 1) return "Target besok";
  return `${days} hari lagi`;
}

function planToForm(plan: Plan): PlanFormState {
  return {
    title: plan.title,
    description: plan.description,
    category: plan.category,
    status: plan.status,
    priority: plan.priority,
    targetDate: plan.targetDate,
    locationName: plan.locationName,
    estimatedBudget: plan.estimatedBudget ? String(plan.estimatedBudget) : "",
    savedAmount: plan.savedAmount ? String(plan.savedAmount) : "",
    participants: plan.participants.join(", "),
    checklist: plan.checklist.map((item) => item.label).join("\n"),
    notes: plan.notes,
  };
}

function createChecklist(value: string, current: PlanChecklistItem[] = []) {
  const existing = new Map(current.map((item) => [item.label.trim().toLocaleLowerCase("id"), item]));
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((label, index) => {
      const previous = existing.get(label.toLocaleLowerCase("id"));
      return previous ?? {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `check-${Date.now()}-${index}`,
        label,
        done: false,
      };
    });
}

function getPlanFromResponse(value: unknown): Plan | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const candidate = (record.plan ?? record.data ?? value) as Partial<Plan>;
  return typeof candidate?.id === "string" ? candidate as Plan : null;
}

async function responseMessage(response: Response) {
  try {
    const body = await response.json() as { error?: string; message?: string };
    return body.error || body.message || "Permintaan belum berhasil. Silakan coba lagi.";
  } catch {
    return "Permintaan belum berhasil. Silakan coba lagi.";
  }
}

function CategoryIcon({ category }: { category: PlanCategory }) {
  if (category === "Perjalanan") return <Plane size={20} />;
  if (category === "Perayaan") return <CakeSlice size={20} />;
  if (category === "Keluarga") return <HouseHeart size={20} />;
  if (category === "Kuliner") return <UtensilsCrossed size={20} />;
  return <NotebookTabs size={20} />;
}

function MetricCard({
  icon,
  value,
  label,
  detail,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  detail: string;
}) {
  return (
    <article className="plan-metric-card">
      <span className="plan-metric-icon">{icon}</span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function PlanCard({
  plan,
  pending,
  onEdit,
  onDelete,
  onStatusChange,
  onChecklistToggle,
}: {
  plan: Plan;
  pending: boolean;
  onEdit: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
  onStatusChange: (plan: Plan, status: PlanStatus) => void;
  onChecklistToggle: (plan: Plan, itemId: string) => void;
}) {
  // Only three steps fit comfortably on a card, but every step counts toward
  // readiness — so the rest have to be reachable rather than merely counted.
  const [showAllChecklist, setShowAllChecklist] = useState(false);
  const savingProgress = progressPercent(plan.savedAmount, plan.estimatedBudget);
  const doneItems = plan.checklist.filter((item) => item.done).length;
  const visibleChecklist = showAllChecklist
    ? plan.checklist
    : plan.checklist.slice(0, 3);
  const hiddenChecklistCount = plan.checklist.length - visibleChecklist.length;
  const readiness = readinessScore(plan);
  const overdue = (daysUntil(plan.targetDate) ?? 0) < 0 && plan.status !== "completed";
  const readinessStyle = { "--plan-progress": `${readiness}%` } as CSSProperties;

  return (
    <article className={`plan-card plan-card-${plan.status}`} aria-busy={pending}>
      <div className="plan-card-topline">
        <span className={`plan-category-icon plan-category-${plan.category.toLocaleLowerCase("id")}`}>
          <CategoryIcon category={plan.category} />
        </span>
        <div className="plan-card-labels">
          <span className={`plan-status plan-status-${plan.status}`}>{statusLabel(plan.status)}</span>
          {plan.priority === "high" && <span className="plan-priority"><Flag size={12} /> Prioritas</span>}
        </div>
        <div className="plan-card-icon-actions">
          <button type="button" onClick={() => onEdit(plan)} aria-label={`Edit rencana ${plan.title}`} disabled={pending}>
            <Edit3 size={17} />
          </button>
          <button type="button" onClick={() => onDelete(plan)} aria-label={`Hapus rencana ${plan.title}`} disabled={pending}>
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <div className="plan-card-copy">
        <p className="plan-card-category">{plan.category} · {priorityLabel(plan.priority)}</p>
        <h3>{plan.title}</h3>
        <p>{plan.description || "Belum ada catatan cerita untuk rencana ini."}</p>
      </div>

      <div className="plan-card-meta">
        <span className={overdue ? "is-overdue" : ""}>
          <CalendarDays size={15} />
          <span>{plan.targetDate ? formatDateID(plan.targetDate) : "Belum bertanggal"}<small>{targetHint(plan)}</small></span>
        </span>
        {plan.locationName && <span><MapPin size={15} /><span>{plan.locationName}</span></span>}
        {plan.participants.length > 0 && (
          <span><Users size={15} /><span>{plan.participants.slice(0, 2).join(", ")}{plan.participants.length > 2 ? ` +${plan.participants.length - 2}` : ""}</span></span>
        )}
      </div>

      {plan.estimatedBudget > 0 && (
        <section className="plan-budget" aria-label={`Tabungan ${plan.title}`}>
          <div className="plan-progress-heading">
            <span><Wallet size={15} /> Dana terkumpul</span>
            <strong>{savingProgress}%</strong>
          </div>
          <div className="plan-progress-track" role="progressbar" aria-valuenow={savingProgress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${savingProgress}%` }} />
          </div>
          <div className="plan-progress-caption">
            <span>{currency.format(plan.savedAmount)}</span>
            <span>dari {currency.format(plan.estimatedBudget)}</span>
          </div>
        </section>
      )}

      <section className="plan-checklist-preview" aria-label={`Checklist ${plan.title}`}>
        <div className="plan-progress-heading">
          <span><ListChecks size={15} /> Persiapan</span>
          <strong>{plan.checklist.length ? `${doneItems}/${plan.checklist.length}` : "Belum ada"}</strong>
        </div>
        {plan.checklist.length > 0 ? (
          <div className="plan-checklist-items">
            {visibleChecklist.map((item) => (
              <label key={item.id} className={item.done ? "is-done" : ""}>
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => onChecklistToggle(plan, item.id)}
                  disabled={pending}
                />
                <span className="plan-checkbox" aria-hidden="true">{item.done ? <Check size={12} /> : null}</span>
                <span>{item.label}</span>
              </label>
            ))}
            {(hiddenChecklistCount > 0 || showAllChecklist) && (
              <button
                type="button"
                className="plan-checklist-toggle"
                aria-expanded={showAllChecklist}
                onClick={() => setShowAllChecklist((current) => !current)}
              >
                {showAllChecklist
                  ? "Tampilkan lebih sedikit"
                  : `Tampilkan ${hiddenChecklistCount} persiapan lainnya`}
              </button>
            )}
          </div>
        ) : (
          <p className="plan-checklist-empty">Tambahkan langkah kecil agar rencana lebih mudah diwujudkan.</p>
        )}
      </section>

      <div className="plan-readiness-row">
        <div className="plan-readiness-gauge" style={readinessStyle} aria-label={`Kesiapan ${readiness} persen`}>
          <span>{readiness}%</span>
        </div>
        <div><strong>Kesiapan rencana</strong><span>{readiness >= 80 ? "Hampir siap diwujudkan" : readiness >= 45 ? "Teruskan persiapannya" : "Mulai dari satu langkah kecil"}</span></div>
      </div>

      <div className="plan-card-footer">
        <label className="plan-status-select">
          <span className="sr-only">Ubah status {plan.title}</span>
          {pending ? <LoaderCircle className="spin" size={15} /> : <Clock3 size={15} />}
          <select value={plan.status} onChange={(event) => onStatusChange(plan, event.target.value as PlanStatus)} disabled={pending}>
            {STATUS_OPTIONS.map((item) => <option value={item.value} key={item.value}>{item.shortLabel}</option>)}
          </select>
        </label>
        <Link href={`/new?plan=${encodeURIComponent(plan.id)}`} className="plan-memory-link">
          Jadikan momen <ArrowRight size={15} />
        </Link>
      </div>
    </article>
  );
}

function PlanDialog({
  editingPlan,
  form,
  saving,
  onFormChange,
  onClose,
  onSubmit,
}: {
  editingPlan: Plan | null;
  form: PlanFormState;
  saving: boolean;
  onFormChange: (form: PlanFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, saving]);

  const update = <K extends keyof PlanFormState>(key: K, value: PlanFormState[K]) => {
    onFormChange({ ...form, [key]: value });
  };

  return (
    <div className="plan-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section className="plan-dialog" role="dialog" aria-modal="true" aria-labelledby="plan-dialog-title">
        <div className="plan-dialog-header">
          <div>
            <p className="eyebrow">{editingPlan ? "Perbarui langkahnya" : "Satu hari nanti"}</p>
            <h2 id="plan-dialog-title">{editingPlan ? "Edit rencana" : "Buat rencana baru"}</h2>
            <p>Simpan gagasan sekarang, lalu wujudkan sedikit demi sedikit.</p>
          </div>
          <button type="button" className="plan-dialog-close" onClick={onClose} disabled={saving} aria-label="Tutup formulir rencana">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="plan-form">
          <div className="plan-form-grid">
            <label className="plan-field plan-field-wide">
              <span>Nama rencana <b aria-hidden="true">*</b></span>
              <input
                type="text"
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Contoh: Road trip keluarga ke Toraja"
                maxLength={100}
                required
                autoFocus
              />
            </label>

            <label className="plan-field plan-field-wide">
              <span>Cerita singkat</span>
              <textarea
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Mengapa rencana ini ingin diwujudkan?"
                maxLength={600}
                rows={3}
              />
            </label>

            <label className="plan-field">
              <span>Kategori</span>
              <select value={form.category} onChange={(event) => update("category", event.target.value as PlanCategory)}>
                {CATEGORY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>

            <label className="plan-field">
              <span>Status</span>
              <select value={form.status} onChange={(event) => update("status", event.target.value as PlanStatus)}>
                {STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>

            <label className="plan-field">
              <span>Prioritas</span>
              <select value={form.priority} onChange={(event) => update("priority", event.target.value as PlanPriority)}>
                {PRIORITY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>

            <label className="plan-field">
              <span>Tanggal target</span>
              <input type="date" value={form.targetDate} onChange={(event) => update("targetDate", event.target.value)} />
            </label>

            <label className="plan-field plan-field-wide">
              <span>Lokasi</span>
              <div className="plan-input-icon"><MapPin size={17} /><input type="text" value={form.locationName} onChange={(event) => update("locationName", event.target.value)} placeholder="Kota atau tempat tujuan" maxLength={120} /></div>
            </label>

            <label className="plan-field">
              <span>Perkiraan biaya</span>
              <div className="plan-input-prefix"><span>Rp</span><input type="number" min="0" step="1000" inputMode="numeric" value={form.estimatedBudget} onChange={(event) => update("estimatedBudget", event.target.value)} placeholder="0" /></div>
            </label>

            <label className="plan-field">
              <span>Dana terkumpul</span>
              <div className="plan-input-prefix"><span>Rp</span><input type="number" min="0" step="1000" inputMode="numeric" value={form.savedAmount} onChange={(event) => update("savedAmount", event.target.value)} placeholder="0" /></div>
            </label>

            <label className="plan-field plan-field-wide">
              <span>Orang yang ikut</span>
              <div className="plan-input-icon"><Users size={17} /><input type="text" value={form.participants} onChange={(event) => update("participants", event.target.value)} placeholder="Ayah, Ibu, Kak Rani (pisahkan dengan koma)" maxLength={300} /></div>
            </label>

            <label className="plan-field plan-field-wide">
              <span>Checklist persiapan <small>satu langkah per baris</small></span>
              <textarea value={form.checklist} onChange={(event) => update("checklist", event.target.value)} placeholder={"Tentukan tanggal\nPesan penginapan\nSiapkan kamera"} rows={5} />
            </label>

            <label className="plan-field plan-field-wide">
              <span>Catatan pribadi</span>
              <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Nomor reservasi, ide kejutan, atau hal kecil yang tidak boleh terlupa…" maxLength={1000} rows={3} />
            </label>
          </div>

          <div className="plan-dialog-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Batal</button>
            <button type="submit" className="primary-button" disabled={saving || !form.title.trim()}>
              {saving ? <LoaderCircle className="spin" size={17} /> : editingPlan ? <Check size={17} /> : <Plus size={17} />}
              {saving ? "Menyimpan…" : editingPlan ? "Simpan perubahan" : "Simpan rencana"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function PlanBoard({ initialPlans }: { initialPlans: Plan[] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PlanStatus>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setEditingPlan(null);
    setForm(EMPTY_FORM);
  };

  const openCreate = () => {
    setEditingPlan(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm(planToForm(plan));
    setDialogOpen(true);
  };

  const stats = useMemo(() => {
    const active = plans.filter((plan) => plan.status !== "completed");
    const totalBudget = active.reduce((sum, plan) => sum + plan.estimatedBudget, 0);
    const totalSaved = active.reduce((sum, plan) => sum + plan.savedAmount, 0);
    const upcoming = active
      .filter((plan) => plan.targetDate && (daysUntil(plan.targetDate) ?? -1) >= 0)
      .sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0];
    return { active, totalBudget, totalSaved, upcoming };
  }, [plans]);

  const filteredPlans = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("id");
    return plans.filter((plan) => {
      const sameStatus = statusFilter === "all" || plan.status === statusFilter;
      const haystack = [plan.title, plan.description, plan.category, plan.locationName, ...plan.participants]
        .join(" ")
        .toLocaleLowerCase("id");
      return sameStatus && (!needle || haystack.includes(needle));
    });
  }, [plans, query, statusFilter]);

  const savePlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    setSaving(true);
    setNotice(null);

    const payload = {
      title,
      description: form.description.trim(),
      category: form.category,
      status: form.status,
      priority: form.priority,
      targetDate: form.targetDate,
      locationName: form.locationName.trim(),
      lat: editingPlan?.lat ?? null,
      lng: editingPlan?.lng ?? null,
      estimatedBudget: Math.max(0, Number(form.estimatedBudget) || 0),
      savedAmount: Math.max(0, Number(form.savedAmount) || 0),
      participants: form.participants.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20),
      checklist: createChecklist(form.checklist, editingPlan?.checklist),
      notes: form.notes.trim(),
    };

    try {
      const endpoint = editingPlan ? `/api/plans/${encodeURIComponent(editingPlan.id)}` : "/api/plans";
      const response = await fetch(endpoint, {
        method: editingPlan ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      const saved = getPlanFromResponse(await response.json());
      if (!saved) throw new Error("Rencana tersimpan, tetapi data terbaru belum dapat dibaca.");

      setPlans((current) => editingPlan
        ? current.map((plan) => plan.id === saved.id ? saved : plan)
        : [saved, ...current]);
      setNotice({ kind: "success", message: editingPlan ? "Perubahan rencana sudah tersimpan." : "Rencana baru sudah masuk ke wishlist." });
      setDialogOpen(false);
      setEditingPlan(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Rencana belum berhasil disimpan." });
    } finally {
      setSaving(false);
    }
  };

  const patchPlan = async (plan: Plan, updates: Partial<Plan>, successMessage?: string) => {
    const previous = plans;
    const optimistic = { ...plan, ...updates };
    setPendingPlanId(plan.id);
    setNotice(null);
    setPlans((current) => current.map((item) => item.id === plan.id ? optimistic : item));
    try {
      const response = await fetch(`/api/plans/${encodeURIComponent(plan.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      const saved = getPlanFromResponse(await response.json());
      if (saved) setPlans((current) => current.map((item) => item.id === saved.id ? saved : item));
      if (successMessage) setNotice({ kind: "success", message: successMessage });
    } catch (error) {
      setPlans(previous);
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Perubahan belum berhasil disimpan." });
    } finally {
      setPendingPlanId(null);
    }
  };

  const changeStatus = (plan: Plan, status: PlanStatus) => {
    if (status === plan.status) return;
    void patchPlan(plan, { status }, status === "completed" ? "Selamat, rencana ini sudah terwujud!" : "Status rencana sudah diperbarui.");
  };

  const toggleChecklist = (plan: Plan, itemId: string) => {
    const checklist = plan.checklist.map((item) => item.id === itemId ? { ...item, done: !item.done } : item);
    void patchPlan(plan, { checklist });
  };

  const deletePlan = async (plan: Plan) => {
    if (!window.confirm(`Hapus rencana “${plan.title}”? Tindakan ini tidak dapat dibatalkan.`)) return;
    setPendingPlanId(plan.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/plans/${encodeURIComponent(plan.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseMessage(response));
      setPlans((current) => current.filter((item) => item.id !== plan.id));
      setNotice({ kind: "success", message: "Rencana sudah dihapus." });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Rencana belum berhasil dihapus." });
    } finally {
      setPendingPlanId(null);
    }
  };

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("all");
  };

  const savingRatio = progressPercent(stats.totalSaved, stats.totalBudget);

  return (
    <div className="plans-page">
      <header className="plan-hero">
        <div className="plan-hero-copy">
          <span className="plan-hero-icon"><Compass size={24} /></span>
          <p className="eyebrow">Dari harapan menjadi kenangan</p>
          <h1>Wishlist &amp; Rencana</h1>
          <p>Simpan tempat yang ingin dikunjungi, acara yang ingin dirayakan, dan mimpi keluarga yang ingin diwujudkan bersama.</p>
          <button type="button" className="primary-button" onClick={openCreate}><Plus size={17} /> Buat rencana</button>
        </div>
        <div className="plan-hero-note" aria-label="Pengingat perencanaan">
          <Sparkles size={20} />
          <blockquote>“Kenangan yang indah sering dimulai dari rencana kecil yang disimpan hari ini.”</blockquote>
          <span>{stats.upcoming ? <>Target terdekat: <strong>{stats.upcoming.title}</strong></> : "Mulai dengan satu hal yang paling ingin diwujudkan."}</span>
        </div>
      </header>

      <section className="plan-metrics" aria-label="Ringkasan rencana">
        <MetricCard icon={<CalendarClock size={20} />} value={String(stats.active.length)} label="Rencana aktif" detail={`${plans.filter((plan) => plan.status === "completed").length} sudah terwujud`} />
        <MetricCard icon={<CircleDollarSign size={20} />} value={currency.format(stats.totalBudget)} label="Target keseluruhan" detail={`${savingRatio}% dana sudah siap`} />
        <MetricCard icon={<Wallet size={20} />} value={currency.format(stats.totalSaved)} label="Dana terkumpul" detail={stats.totalBudget ? `${currency.format(Math.max(0, stats.totalBudget - stats.totalSaved))} lagi` : "Tambahkan target dana"} />
        <MetricCard icon={<CalendarDays size={20} />} value={stats.upcoming ? formatDateID(stats.upcoming.targetDate) : "Belum ada"} label="Target terdekat" detail={stats.upcoming?.title ?? "Pilih tanggal target"} />
      </section>

      {notice && (
        <div className={`plan-notice plan-notice-${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
          {notice.kind === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Tutup pemberitahuan"><X size={16} /></button>
        </div>
      )}

      <section className="plan-board-section" aria-labelledby="plan-list-heading">
        <div className="section-heading-row">
          <div><p className="eyebrow">Peta langkah berikutnya</p><h2 id="plan-list-heading">Semua rencana</h2><p>{filteredPlans.length} dari {plans.length} rencana ditampilkan.</p></div>
          <button type="button" className="secondary-button plan-add-secondary" onClick={openCreate}><Plus size={16} /> Tambah rencana</button>
        </div>

        <div className="plan-toolbar">
          <label className="search-box plan-search">
            <Search size={18} />
            <span className="sr-only">Cari rencana</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari tujuan, tempat, atau orang…" />
          </label>
          <div className="plan-status-filters" aria-label="Filter status rencana">
            <button type="button" className={statusFilter === "all" ? "active" : ""} onClick={() => setStatusFilter("all")}>Semua <span>{plans.length}</span></button>
            {STATUS_OPTIONS.map((item) => (
              <button type="button" key={item.value} className={statusFilter === item.value ? "active" : ""} onClick={() => setStatusFilter(item.value)}>
                {item.shortLabel} <span>{plans.filter((plan) => plan.status === item.value).length}</span>
              </button>
            ))}
          </div>
        </div>

        {filteredPlans.length ? (
          <div className="plan-grid">
            {filteredPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                pending={pendingPlanId === plan.id}
                onEdit={openEdit}
                onDelete={(item) => void deletePlan(item)}
                onStatusChange={changeStatus}
                onChecklistToggle={toggleChecklist}
              />
            ))}
          </div>
        ) : plans.length ? (
          <div className="plan-empty-state">
            <Search size={28} />
            <h3>Rencana itu belum ditemukan</h3>
            <p>Coba kata lain atau tampilkan kembali semua status.</p>
            <button type="button" className="secondary-button" onClick={resetFilters}>Hapus filter</button>
          </div>
        ) : (
          <div className="plan-empty-state plan-empty-first">
            <span><Heart size={28} /></span>
            <h3>Wishlist keluarga masih kosong</h3>
            <p>Mulai dari perjalanan impian, perayaan kecil, atau proyek album yang sudah lama dibicarakan.</p>
            <button type="button" className="primary-button" onClick={openCreate}><Plus size={17} /> Buat rencana pertama</button>
          </div>
        )}
      </section>

      {dialogOpen && (
        <PlanDialog
          editingPlan={editingPlan}
          form={form}
          saving={saving}
          onFormChange={setForm}
          onClose={closeDialog}
          onSubmit={savePlan}
        />
      )}
    </div>
  );
}
