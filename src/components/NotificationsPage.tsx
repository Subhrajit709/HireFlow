import Link from "next/link";
import { listNotifications } from "@/lib/data";
import { fmtAgo } from "@/lib/format";
import { Empty, PageHeader } from "./ui";
import { MarkAllRead } from "./MarkAllRead";

/** Shared notifications list for both portals. Unread items are highlighted, then marked read on view. */
export async function NotificationsPage({ userId }: { userId: number }) {
  const items = await listNotifications(userId, 100);
  const unread = items.filter((n) => !n.read).length;
  return (
    <>
      <PageHeader title="Notifications" sub={unread ? `${unread} new` : "You're all caught up."} />
      <MarkAllRead hasUnread={unread > 0} />
      {items.length === 0 ? (
        <Empty title="No notifications yet" />
      ) : (
        <div className="stack" style={{ maxWidth: 760 }}>
          {items.map((n) => {
            const inner = (
              <div className="row between top">
                <div className="grow">
                  <b>{n.title}</b> {!n.read && <span className="badge bg-red">new</span>}
                  {n.body && <p className="small mb-0 muted">{n.body}</p>}
                </div>
                <span className="tiny muted nowrap">{fmtAgo(n.created_at)}</span>
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className={`card tight hover ${n.read ? "flat" : "bg-yellow"}`}>
                {inner}
              </Link>
            ) : (
              <div key={n.id} className={`card tight ${n.read ? "flat" : "bg-yellow"}`}>
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
