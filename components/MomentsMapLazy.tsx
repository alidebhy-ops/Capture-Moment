"use client";

import dynamic from "next/dynamic";

const MomentsMapLazy = dynamic(() => import("./MomentsMap"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--surface-glass)] flex items-center justify-center text-[color:var(--color-ink-soft)]" style={{ height: "40vh" }}>
      Memuat peta...
    </div>
  ),
});

export default MomentsMapLazy;
