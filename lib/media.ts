import type { MediaItem, Moment } from "./types";

export function mediaSrc(media: MediaItem): string {
  return media.src || `/api/photo/${media.id}`;
}

export function mediaPoster(media: MediaItem): string | undefined {
  return media.poster || (media.type === "image" ? mediaSrc(media) : undefined);
}

export function coverMedia(moment: Moment): MediaItem | undefined {
  return (
    moment.media.find((item) => item.id === moment.coverPhotoId) ||
    moment.media.find((item) => item.type === "image") ||
    moment.media[0]
  );
}

export function coverSrc(moment: Moment): string {
  const cover = coverMedia(moment);
  if (!cover) return "";
  return cover.type === "video" ? cover.poster || "" : mediaSrc(cover);
}
