import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getDocs, getProfile } from "@/lib/data";
import { profileCompleteness } from "@/lib/scoring";
import { ProfileView } from "@/components/ProfileView";
import { Avatar, PageHeader } from "@/components/ui";

export const metadata = { title: "Profile preview" };

export default async function PreviewPage() {
  const user = await requireRole("candidate");
  const [{ profile }, docs] = await Promise.all([getProfile(user.id), getDocs(user.id)]);
  const comp = profileCompleteness(profile, docs);
  return (
    <>
      <PageHeader title="What recruiters see" sub="This is exactly how your profile appears on the recruiter's review screen.">
        <Link href="/candidate/profile" className="btn primary">
          ← Edit profile
        </Link>
      </PageHeader>
      {!comp.canApply && (
        <div className="alert yellow mb">
          <b>Still missing:</b> {comp.missingRequired.join(" · ")}
        </div>
      )}
      <div className="card mb row" style={{ marginBottom: 20 }}>
        <Avatar name={profile.personal.fullName || user.name} large />
        <div className="grow">
          <h2 className="mb-0">{profile.personal.fullName || user.name}</h2>
          <p className="muted mb-0">{profile.personal.headline || "No headline yet"}</p>
        </div>
      </div>
      <ProfileView profile={profile} docs={docs} email={user.email} docHref={(d) => `/api/documents/${d.id}`} />
    </>
  );
}
