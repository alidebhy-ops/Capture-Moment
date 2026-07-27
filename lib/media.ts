import type { MediaItem, Moment } from "./types";

// Matches the widths the photo route is willing to serve.
export type ThumbnailWidth = 200 | 400 | 800;

export function mediaSrc(media: MediaItem): string {
  return media.src || `/api/photo/${media.id}`;
}

// Grid tiles and map popups render at a few hundred pixels; asking Drive for a
// thumbnail at that size instead of the original turns megabytes into kilobytes.
// Demo fixtures and any media with an explicit src are left untouched.
export function mediaThumbSrc(
  media: MediaItem,
  width: ThumbnailWidth = 400
): string {
  return media.src || `/api/photo/${media.id}?w=${width}`;
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

export function coverThumbSrc(
  moment: Moment,
  width: ThumbnailWidth = 400
): string {
  const cover = coverMedia(moment);
  if (!cover) return "";
  return cover.type === "video" ? cover.poster || "" : mediaThumbSrc(cover, width);
}
