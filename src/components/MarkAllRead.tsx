"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Marks everything read shortly after the page is viewed, then refreshes the bell count. */
export function MarkAllRead({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!hasUnread) return;
    const t = setTimeout(async () => {
      await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
      router.refresh();
    }, 1500);
    return () => clearTimeout(t);
  }, [hasUnread, router]);
  return null;
}
