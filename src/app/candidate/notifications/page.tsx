import { requireRole } from "@/lib/auth";
import { NotificationsPage } from "@/components/NotificationsPage";

export const metadata = { title: "Notifications" };

export default async function Page() {
  const user = await requireRole("candidate");
  return <NotificationsPage userId={user.id} />;
}
