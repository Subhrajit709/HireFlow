import Link from "next/link";
import { LogoutButton, NavLinks } from "./client";
import type { SessionUser } from "@/lib/types";

export function AppShell({
  user,
  links,
  unread,
  children,
}: {
  user: SessionUser;
  links: { href: string; label: string; exact?: boolean }[];
  unread: number;
  children: React.ReactNode;
}) {
  const home = user.role === "recruiter" ? "/recruiter" : "/candidate";
  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link href={home} className="brand">
            <span className="brand-mark">H</span>
            HireFlow
          </Link>
          <NavLinks links={links} />
          <div className="nav-right">
            <span className={`role-pill hide-sm ${user.role === "recruiter" ? "bg-purple" : "bg-green"}`}>{user.role}</span>
            <Link href={`${home}/notifications`} className="btn icon-btn" aria-label={`Notifications (${unread} unread)`} title="Notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {unread > 0 && <span className="dot">{unread > 9 ? "9+" : unread}</span>}
            </Link>
            <span className="small hide-sm" style={{ fontWeight: 700 }}>
              {user.name.split(" ")[0]}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="container page">{children}</main>
    </>
  );
}
