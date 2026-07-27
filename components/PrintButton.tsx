"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button type="button" className="primary-button" onClick={() => window.print()}>
      <Printer size={17} /> Cetak atau simpan PDF
    </button>
  );
}
