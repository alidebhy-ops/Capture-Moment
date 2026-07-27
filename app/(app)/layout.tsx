import AppNav from "@/components/AppNav";
import PwaInstaller from "@/components/PwaInstaller";
import { isDemoMode } from "@/lib/demo";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="app-shell">
      <AppNav demoMode={isDemoMode()} />
      <div className="app-content">
        <main className="content-main">{children}</main>
        <footer className="app-footer">
          Dibuat untuk menyimpan cerita yang terlalu berharga untuk terlupakan.
        </footer>
      </div>
      <PwaInstaller />
    </div>
  );
}
