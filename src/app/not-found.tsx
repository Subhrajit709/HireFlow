import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container" style={{ maxWidth: 520, paddingBlock: "80px" }}>
      <div className="card center">
        <p className="caps">404</p>
        <h1>Nothing here</h1>
        <p className="muted">That page doesn&apos;t exist or you don&apos;t have access to it.</p>
        <Link href="/" className="btn primary">
          Go home
        </Link>
      </div>
    </main>
  );
}
