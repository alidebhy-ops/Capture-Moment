"use client";

import dynamic from "next/dynamic";

const LocationPickerLazy = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-xl border border-[color:var(--color-line)] bg-[color:var(--surface-glass)] flex items-center justify-center text-[color:var(--color-ink-soft)]"
      style={{ height: 280 }}
    >
      Memuat peta...
    </div>
  ),
});

export default LocationPickerLazy;
