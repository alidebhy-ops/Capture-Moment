"use client";

import { ChevronLeft, ChevronRight, Images, Play } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { mediaPoster, mediaSrc } from "@/lib/media";
import type { MediaItem } from "@/lib/types";

// Bingkai galeri dulu dikunci 16:9, jadi foto potret — sebagian besar foto
// ponsel — terpotong parah di atas dan bawah. Rasio sekarang mengikuti ukuran
// asli medianya, dibatasi supaya foto yang sangat panjang tidak mendorong
// seluruh halaman ke bawah.
const MIN_ASPECT = 0.7;
const MAX_ASPECT = 16 / 9;

export default function MediaGallery({ media, title }: { media: MediaItem[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [aspects, setAspects] = useState<Record<string, number>>({});
  const active = media[activeIndex];
  if (!active) return null;

  function rememberAspect(id: string, width: number, height: number) {
    if (!width || !height) return;
    const ratio = Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, width / height));
    setAspects((current) =>
      current[id] === ratio ? current : { ...current, [id]: ratio }
    );
  }

  const stageStyle = {
    "--stage-aspect": String(aspects[active.id] ?? MAX_ASPECT),
  } as CSSProperties;

  function move(direction: number) {
    setActiveIndex((current) => (current + direction + media.length) % media.length);
  }

  return (
    <section className="media-gallery" aria-label={`Galeri ${title}`}>
      <div className="gallery-stage" style={stageStyle}>
        {active.type === "video" ? (
          <video
            key={active.id}
            src={mediaSrc(active)}
            poster={mediaPoster(active)}
            controls
            playsInline
            onLoadedMetadata={(event) =>
              rememberAspect(
                active.id,
                event.currentTarget.videoWidth,
                event.currentTarget.videoHeight
              )
            }
          >
            Browser tidak mendukung pemutaran video.
          </video>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaSrc(active)}
            alt={active.alt || `${title}, media ${activeIndex + 1}`}
            onLoad={(event) =>
              rememberAspect(
                active.id,
                event.currentTarget.naturalWidth,
                event.currentTarget.naturalHeight
              )
            }
          />
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
