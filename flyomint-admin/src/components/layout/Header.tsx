import { useState } from "react";
import { Bell, ChevronDown, LogOut, Menu, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const initials = profile?.Name
    ? profile.Name.split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "A";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-[var(--color-border-soft)] bg-[var(--color-surface)]/80 backdrop-blur px-4 md:px-6 py-3">
      <button
        onClick={onMenuClick}
        className="btn-icon md:hidden"
        aria-label="Toggle menu"
      >
        <Menu size={18} />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <button className="btn-icon relative" aria-label="Notifications">
          <Bell size={17} />
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--color-surface-2)] transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand)] text-xs font-semibold text-white">
              {initials}
            </div>
            <ChevronDown size={14} className="text-[var(--color-text-muted)]" />
          </button>

          {open && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-2 w-56 card-base shadow-xl py-1.5">
                <div className="px-3.5 py-2 border-b border-[var(--color-border-soft)]">
                  <p className="text-sm font-medium truncate">
                    {profile?.Name ?? "Admin"}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">
                    {profile?.Email ?? ""}
                  </p>
                </div>
                <button className="flex w-full items-center gap-2 px-3.5 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]">
                  <User size={14} /> Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
                >
                  <LogOut size={14} /> Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
