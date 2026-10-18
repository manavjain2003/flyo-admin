import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export function RequirePermission({ viewId, children }: { viewId: string; children: ReactNode }) {
  const { hasPermission, isLoading, profile } = useAuth();

  if (isLoading || !profile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-brand)]" size={24} />
      </div>
    );
  }

  return hasPermission(viewId, "R") ? <>{children}</> : <Navigate to="/" replace />;
}
