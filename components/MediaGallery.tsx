"use client";

import { ChevronLeft, ChevronRight, Images, Play } from "lucide-react";
import { useState } from "react";
import { mediaPoster, mediaSrc } from "@/lib/media";
import type { MediaItem } from "@/lib/types";

export default function MediaGallery({ media, title }: { media: MediaItem[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = media[activeIndex];
  if (!active) return null;

  function move(direction: number) {
    setActiveIndex((current) => (current + direction + media.length) % media.length);
  }

  return (
    <section className="media-gallery" aria-label={`Galeri ${title}`}>
      <div className="gallery-stage">
        {active.type === "video" ? (
          <video
            key={active.id}
            src={mediaSrc(active)}
            poster={mediaPoster(active)}
            controls
            playsInline
          >
            Browser tidak mendukung pemutaran video.
          </video>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaSrc(active)} alt={active.alt || `${title}, media ${activeIndex + 1}`} />
        )}
        <span className="gallery-count"><Images size={15} /> {activeIndex + 1} / {media.length}</span>
        {media.length > 1 && (
          <>
            <button type="button" className="gallery-arrow previous" onClick={() => move(-1)} aria-label="Media sebelumnya">
              <ChevronLeft />
            </button>
            <button type="button" className="gallery-arrow next" onClick={() => move(1)} aria-label="Media berikutnya">
              <ChevronRight />
            </button>
          </>
        )}
      </div>
      {media.length > 1 && (
        <div className="gallery-thumbs">
          {media.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={activeIndex === index ? "active" : ""}
              onClick={() => setActiveIndex(index)}
              aria-label={`Tampilkan media ${index + 1}`}
            >
              {mediaPoster(item) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaPoster(item)} alt="" />
              ) : (
                <span className="video-thumb"><Play fill="currentColor" /></span>
              )}
              {item.type === "video" && <span className="thumb-play"><Play size={14} fill="currentColor" /></span>}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
