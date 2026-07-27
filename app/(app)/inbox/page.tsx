import { ScanSearch } from "lucide-react";
import SmartInbox from "@/components/SmartInbox";

export default function SmartInboxPage() {
  return (
    <div className="inbox-page">
      <header className="page-header-row">
        <div>
          <p className="eyebrow">Capture Pocket</p>
          <h1>Smart Memory Inbox.</h1>
          <p>Pilih banyak media sekaligus, lalu ubah kelompok tanggal menjadi cerita yang rapi.</p>
        </div>
        <span className="page-header-icon"><ScanSearch size={23} /></span>
      </header>
      <SmartInbox />
    </div>
  );
}
