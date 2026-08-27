"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  BookHeart,
  BookOpenText,
  CalendarDays,
  FolderHeart,
  History,
  Home,
  Inbox,
  ListTodo,
  LockKeyhole,
  MapPinned,
  Menu,
  Plus,
  Settings2,
  UsersRound,
  X,
} from "lucide-react";
import LogoutButton from "./LogoutButton";
import { useEffect, useRef, useState } from "react";

const mainNav = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/memories", label: "Kilas balik", icon: History },
  { href: "/calendar", label: "Kalender", icon: CalendarDays },
  { href: "/plans", label: "Rencana", icon: ListTodo },
  { href: "/people", label: "Profil kita", icon: UsersRound },
];

const libraryNav = [
  { href: "/collections", label: "Koleksi", icon: FolderHeart },
  { href: "/map", label: "Peta momen", icon: MapPinned },
  { href: "/capsules", label: "Kapsul waktu", icon: LockKeyhole },
  { href: "/inbox", label: "Smart Inbox", icon: Inbox },
  { href: "/archive", label: "Arsip & backup", icon: Archive },
  { href: "/panduan", label: "Panduan", icon: BookHeart },
  { href: "/settings", label: "Pengaturan", icon: Settings2 },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export default function AppNav({ demoMode }: { demoMode: boolean }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuPanelRef = useRef<HTMLElement>(null);
  const mobileMenuCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const menuButton = mobileMenuButtonRef.current;
    const focusTimer = window.requestAnimationFrame(() => {
      mobileMenuCloseRef.current?.focus();
    });
    const handleMenuKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        mobileMenuPanelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleMenuKeys);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      window.removeEventListener("keydown", handleMenuKeys);
      menuButton?.focus();
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <aside className="app-sidebar">
        <Link href="/" className="brand-lockup" aria-label="CaptureMoment, beranda">
          <span className="brand-mark"><BookHeart size={20} strokeWidth={2.2} /></span>
          <span><strong>Capture</strong>Moment</span>
        </Link>

        <div className="family-card">
          <div className="avatar-stack" aria-hidden="true">
            <span>MA</span><span>RA</span>
          </div>
          <div>
            <p>Kita Berdua</p>
            <span>{demoMode ? "Ruang demo aktif" : "Ruang kita"}</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Navigasi utama">
          <p className="nav-eyebrow">Ruang kenangan</p>
          {mainNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={isActive(pathname, href) ? "nav-item active" : "nav-item"}
              aria-current={isActive(pathname, href) ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <nav className="sidebar-nav sidebar-library-nav" aria-label="Jelajahi dan kelola">
          <p className="nav-eyebrow">Jelajahi &amp; kelola</p>
          {libraryNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={isActive(pathname, href) ? "nav-item active" : "nav-item"}
              aria-current={isActive(pathname, href) ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          ))}
          <Link href="/new" className="new-moment-button">
            <Plus size={19} />
            <span>Buat cerita</span>
          </Link>
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-bottom">
          {demoMode && (
            <div className="demo-note">
              <span className="demo-note-dot" />
              <div>
                <strong>Mode preview</strong>
                <p>Data contoh siap dijelajahi.</p>
              </div>
            </div>
          )}
          <LogoutButton variant="sidebar" />
        </div>
      </aside>

      <header className="mobile-header">
        <Link href="/" className="brand-lockup" aria-label="CaptureMoment, beranda">
          <span className="brand-mark"><BookHeart size={18} /></span>
          <span><strong>Capture</strong>Moment</span>
        </Link>
        <div className="mobile-header-actions">
          <Link href="/new" className="mobile-add" aria-label="Tambah momen">
            <Plus size={20} />
          </Link>
          <button
            ref={mobileMenuButtonRef}
            type="button"
            className="mobile-menu-button"
            aria-label={mobileMenuOpen ? "Tutup menu lainnya" : "Buka menu lainnya"}
            aria-controls="mobile-library-menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            className="mobile-menu-scrim"
            aria-label="Tutup menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            ref={mobileMenuPanelRef}
            className="mobile-library-menu"
            id="mobile-library-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi lainnya"
          >
            <div>
              <p className="nav-eyebrow">Jelajahi &amp; kelola</p>
              <button
                ref={mobileMenuCloseRef}
                type="button"
                aria-label="Tutup menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <nav aria-label="Menu lainnya">
              {libraryNav.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={isActive(pathname, href) ? "nav-item active" : "nav-item"}
                  aria-current={isActive(pathname, href) ? "page" : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon size={19} />
                  <span>{label}</span>
                </Link>
              ))}
              <Link
                href="/photobook"
                className={isActive(pathname, "/photobook") ? "nav-item active" : "nav-item"}
                aria-current={
                  isActive(pathname, "/photobook") ? "page" : undefined
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                <BookOpenText size={19} />
                <span>Photobook</span>
              </Link>
            </nav>
            {demoMode && <p className="mobile-menu-demo">Preview aktif · data contoh aman dijelajahi.</p>}
            <LogoutButton variant="sidebar" />
          </aside>
        </>
      )}

      <nav className="bottom-nav" aria-label="Navigasi perangkat seluler">
        {mainNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={isActive(pathname, href) ? "active" : ""}
            aria-current={isActive(pathname, href) ? "page" : undefined}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Icon size={20} />
            <span>{label === "Kilas balik" ? "Kenangan" : label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
