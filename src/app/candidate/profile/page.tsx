import { requireRole } from "@/lib/auth";
import { getDocs, getProfile } from "@/lib/data";
import { fmtAgo } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { ProfileEditor } from "./ProfileEditor";

export const metadata = { title: "My profile" };

export default async function ProfilePage() {
  const user = await requireRole("candidate");
  const [{ profile, updatedAt }, docs] = await Promise.all([getProfile(user.id), getDocs(user.id)]);
  return (
    <>
      <PageHeader
        title="My recruitment profile"
        sub={
          <>
            One profile for every application. You can keep it updated at any time, and recruiters always see the latest version.
            {updatedAt && <> Last saved {fmtAgo(updatedAt)}.</>}
          </>
        }
      />
      <ProfileEditor initial={profile} docs={docs} />
    </>
  );
}
