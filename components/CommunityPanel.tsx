"use client";

import {
  LoaderCircle,
  MessageCircle,
  Send,
  Trash2,
  UsersRound,
} from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import {
  COMMUNITY_REACTIONS,
  type CommunityComment,
  type CommunityReactionKind,
  type FamilyMember,
  type MomentCommunity,
} from "@/lib/family-types";

type CommunityPanelProps = {
  momentId: string;
  initialCommunity: MomentCommunity;
  members: FamilyMember[];
};

const REACTION_META: Record<
  CommunityReactionKind,
  { symbol: string; label: string }
> = {
  heart: { symbol: "❤", label: "Menghangatkan hati" },
  laugh: { symbol: "😂", label: "Membuat tertawa" },
  tears: { symbol: "🥹", label: "Membuat terharu" },
  applause: { symbol: "👏", label: "Rayakan momen ini" },
};

function profileStyle(color: string): CSSProperties {
  return { "--community-color": color } as CSSProperties;
}

function apiError(payload: unknown, fallback: string): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return fallback;
}

function formatCommentTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function CommunityPanel({
  momentId,
  initialCommunity,
  members,
}: CommunityPanelProps) {
  const contributingMembers = members.filter(
    (member) => member.role !== "viewer"
  );
  const [community, setCommunity] = useState(initialCommunity);
  const [authorId, setAuthorId] = useState(
    contributingMembers[0]?.id ?? ""
  );
  const [body, setBody] = useState("");
  const [commentPending, setCommentPending] = useState(false);
  const [reactionPending, setReactionPending] =
    useState<CommunityReactionKind | null>(null);
  const [deletingComment, setDeletingComment] = useState<string | null>(null);
  const [error, setError] = useState("");

  const memberById = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members]
  );
  const author = memberById.get(authorId);

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = body.trim();
    if (!clean || !authorId || commentPending) return;

    const snapshot = community;
    const optimistic: CommunityComment = {
      id: `temporary-${Date.now()}`,
      momentId,
      authorId,
      body: clean,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCommunity((current) => ({
      ...current,
      comments: [...current.comments, optimistic],
    }));
    setBody("");
    setCommentPending(true);
    setError("");

    try {
      const response = await fetch(`/api/moments/${momentId}/community`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "comment", authorId, body: clean }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(apiError(result, "Komentar belum dapat disimpan."));
      }
      if (
        typeof result !== "object" ||
        result === null ||
        !("community" in result)
      ) {
        throw new Error("Respons percakapan tidak lengkap.");
      }
      setCommunity(result.community as MomentCommunity);
    } catch (caught) {
      setCommunity(snapshot);
      setBody(clean);
      setError(
        caught instanceof Error
          ? caught.message
          : "Komentar belum dapat disimpan."
      );
    } finally {
      setCommentPending(false);
    }
  }

  async function toggleReaction(reaction: CommunityReactionKind) {
    if (!authorId || reactionPending) return;
    const snapshot = community;
    const existing = community.reactions.find(
      (item) =>
        item.authorId === authorId &&
        item.reaction === reaction &&
        item.momentId === momentId
    );
    setCommunity((current) => ({
      ...current,
      reactions: existing
        ? current.reactions.filter((item) => item.id !== existing.id)
        : [
            ...current.reactions,
            {
              id: `temporary-${reaction}-${Date.now()}`,
              momentId,
              authorId,
              reaction,
              createdAt: new Date().toISOString(),
            },
          ],
    }));
    setReactionPending(reaction);
    setError("");

    try {
      const response = await fetch(`/api/moments/${momentId}/community`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reaction", authorId, reaction }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(apiError(result, "Reaksi belum dapat disimpan."));
      }
      if (
        typeof result !== "object" ||
        result === null ||
        !("community" in result)
      ) {
        throw new Error("Respons reaksi tidak lengkap.");
      }
      setCommunity(result.community as MomentCommunity);
    } catch (caught) {
      setCommunity(snapshot);
      setError(
        caught instanceof Error ? caught.message : "Reaksi belum dapat disimpan."
      );
    } finally {
      setReactionPending(null);
    }
  }

  async function deleteComment(comment: CommunityComment) {
    if (comment.authorId !== authorId || deletingComment) return;
    const snapshot = community;
    setCommunity((current) => ({
      ...current,
      comments: current.comments.filter((item) => item.id !== comment.id),
    }));
    setDeletingComment(comment.id);
    setError("");

    try {
      const response = await fetch(`/api/moments/${momentId}/community`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorId, commentId: comment.id }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(apiError(result, "Komentar belum dapat dihapus."));
      }
      if (
        typeof result === "object" &&
        result !== null &&
        "community" in result
      ) {
        setCommunity(result.community as MomentCommunity);
      }
    } catch (caught) {
      setCommunity(snapshot);
      setError(
        caught instanceof Error ? caught.message : "Komentar belum dapat dihapus."
      );
    } finally {
      setDeletingComment(null);
    }
  }

  if (!members.length) {
    return (
      <section className="community-panel community-panel-empty">
        <UsersRound size={28} />
        <h2>Undang keluarga ke dalam cerita</h2>
        <p>
          Tambahkan profil anggota terlebih dahulu agar mereka dapat meninggalkan
          komentar dan reaksi.
        </p>
      </section>
    );
  }

  return (
    <section className="community-panel" aria-labelledby="community-title">
      <header className="community-header">
        <div>
          <p className="community-eyebrow">Cerita bersama</p>
          <h2 id="community-title">Suara dari keluarga</h2>
          <p>
            Setiap orang boleh menambahkan ingatan kecil dari sudut pandangnya.
          </p>
        </div>
        <label className="community-author-picker">
          <span>Saya menulis sebagai</span>
          <span
            className="community-author-select"
            style={profileStyle(author?.color ?? "#a8573d")}
          >
            <b aria-hidden="true">{author?.initials ?? "?"}</b>
            <select
              value={authorId}
              onChange={(event) => setAuthorId(event.target.value)}
            >
              {contributingMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </span>
        </label>
      </header>

      <div className="community-reactions" aria-label="Reaksi keluarga">
        {COMMUNITY_REACTIONS.map((reaction) => {
          const meta = REACTION_META[reaction];
          const people = community.reactions.filter(
            (item) => item.reaction === reaction
          );
          const active = people.some((item) => item.authorId === authorId);
          const names = people
            .map((item) => memberById.get(item.authorId)?.name)
            .filter(Boolean)
            .join(", ");
          return (
            <button
              key={reaction}
              type="button"
              className={
                active
                  ? "community-reaction community-reaction-active"
                  : "community-reaction"
              }
              aria-label={`${meta.label}. ${people.length} reaksi${names ? ` dari ${names}` : ""}`}
              aria-pressed={active}
              disabled={reactionPending !== null}
              onClick={() => toggleReaction(reaction)}
            >
              <span aria-hidden="true">{meta.symbol}</span>
              <b>{people.length}</b>
              <small>{meta.label}</small>
              {reactionPending === reaction && (
                <LoaderCircle className="community-spin" size={13} />
              )}
            </button>
          );
        })}
      </div>

      <div className="community-conversation">
        <div className="community-conversation-title">
          <MessageCircle size={18} />
          <h3>Komentar keluarga</h3>
          <span>{community.comments.length}</span>
        </div>

        {community.comments.length ? (
          <div className="community-comment-list">
            {community.comments.map((comment) => {
              const commentAuthor = memberById.get(comment.authorId);
              return (
                <article className="community-comment" key={comment.id}>
                  <span
                    className="community-comment-avatar"
                    style={profileStyle(commentAuthor?.color ?? "#8a7354")}
                    aria-hidden="true"
                  >
                    {commentAuthor?.initials ?? "?"}
                  </span>
                  <div className="community-comment-body">
                    <header>
                      <strong>
                        {commentAuthor?.name ?? "Anggota keluarga terdahulu"}
                      </strong>
                      <time dateTime={comment.createdAt}>
                        {formatCommentTime(comment.createdAt)}
                      </time>
                    </header>
                    <p>{comment.body}</p>
                  </div>
                  {comment.authorId === authorId &&
                    !comment.id.startsWith("temporary-") && (
                      <button
                        type="button"
                        className="community-comment-delete"
                        aria-label="Hapus komentar"
                        disabled={deletingComment === comment.id}
                        onClick={() => deleteComment(comment)}
                      >
                        {deletingComment === comment.id ? (
                          <LoaderCircle className="community-spin" size={14} />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="community-comments-empty">
            <MessageCircle size={23} />
            <p>Belum ada komentar. Jadilah yang pertama menambahkan ingatan.</p>
          </div>
        )}

        <form className="community-comment-form" onSubmit={submitComment}>
          <span
            className="community-form-avatar"
            style={profileStyle(author?.color ?? "#a8573d")}
            aria-hidden="true"
          >
            {author?.initials ?? "?"}
          </span>
          <label>
            <span className="community-sr-only">Tulis komentar keluarga</span>
            <textarea
              rows={2}
              maxLength={1_200}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={`Apa yang ${author?.name ?? "Anda"} ingat dari hari ini?`}
            />
          </label>
          <button
            type="submit"
            aria-label="Kirim komentar"
            disabled={!body.trim() || commentPending}
          >
            {commentPending ? (
              <LoaderCircle className="community-spin" size={18} />
            ) : (
              <Send size={18} />
            )}
          </button>
        </form>
        {error && (
          <p className="community-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
