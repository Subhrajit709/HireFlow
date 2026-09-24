import Link from "next/link";
import { RegisterForm } from "./RegisterForm";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <main className="container" style={{ maxWidth: 500, paddingBlock: "60px" }}>
      <Link href="/" className="brand" style={{ marginBottom: 28, display: "inline-flex" }}>
        <span className="brand-mark">H</span>HireFlow
      </Link>
      <div className="card">
        <h1>Create your account</h1>
        <p className="muted">One profile, reused for every job you apply to. Takes about 10 minutes to complete.</p>
        <RegisterForm />
      </div>
      <p className="center mt">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
