import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; as?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="container" style={{ maxWidth: 460, paddingBlock: "60px" }}>
      <Link href="/" className="brand" style={{ marginBottom: 28, display: "inline-flex" }}>
        <span className="brand-mark">H</span>HireFlow
      </Link>
      <div className="card">
        <h1>Welcome back</h1>
        <p className="muted">Candidates and recruiters use the same login. You&apos;ll land in the right portal.</p>
        <LoginForm next={sp.next} as={sp.as} />
      </div>
      <p className="center mt">
        New candidate? <Link href="/register">Create an account</Link>
      </p>
    </main>
  );
}
