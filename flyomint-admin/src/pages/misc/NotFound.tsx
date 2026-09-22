import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-[var(--color-bg)] text-center px-6">
      <p className="text-6xl font-bold text-[var(--color-brand)]">404</p>
      <p className="text-[var(--color-text-secondary)]">Page not found.</p>
      <Link to="/" className="btn-primary mt-3">
        Back to Dashboard
      </Link>
    </div>
  );
}
