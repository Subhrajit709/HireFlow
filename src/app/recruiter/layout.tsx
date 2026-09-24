import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/auth";
import { unreadCount } from "@/lib/data";

export default async function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("recruiter");
  const unread = await unreadCount(user.id);
  return (
    <AppShell
      user={user}
      unread={unread}
      links={[
        { href: "/recruiter", label: "Dashboard", exact: true },
        { href: "/recruiter/candidates", label: "Candidates" },
        { href: "/recruiter/board", label: "Pipeline" },
        { href: "/recruiter/jobs", label: "Jobs" },
      ]}
    >
      {children}
    </AppShell>
  );
}
