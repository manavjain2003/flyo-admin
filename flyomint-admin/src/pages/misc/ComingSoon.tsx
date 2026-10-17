import { Construction } from "lucide-react";
import { PageHeader } from "../../components/common/UI";

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} description="Manage your data with auto-generated CRUD." />
      <div className="card-base flex flex-col items-center justify-center gap-3 py-20 text-center">
        <Construction size={28} className="text-[var(--color-text-muted)]" />
        <p className="text-sm text-[var(--color-text-secondary)] max-w-sm">
          This section isn't wired up to an API yet. Add its endpoints to{" "}
          <code className="text-xs bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded">
            src/api/endpoints.ts
          </code>{" "}
          to bring it to life.
        </p>
      </div>
    </div>
  );
}
