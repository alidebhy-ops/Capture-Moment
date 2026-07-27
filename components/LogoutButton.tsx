"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LogoutButton({ variant = "icon" }: { variant?: "icon" | "sidebar" }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      title="Keluar"
      className={variant === "sidebar" ? "nav-item danger" : "icon-button"}
    >
      <LogOut size={19} />
      {variant === "sidebar" && <span>Keluar</span>}
    </button>
  );
}
