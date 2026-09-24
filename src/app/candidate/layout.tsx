import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/auth";
import { unreadCount } from "@/lib/data";

export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("candidate");
  const unread = await unreadCount(user.id);
  return (
    <AppShell
      user={user}
      unread={unread}
      links={[
        { href: "/candidate", label: "Dashboard", exact: true },
        { href: "/candidate/profile", label: "My Profile" },
        { href: "/candidate/jobs", label: "Open Jobs" },
        { href: "/candidate/applications", label: "My Applications" },
      ]}
    >
      {children}
    </AppShell>
  );
}
