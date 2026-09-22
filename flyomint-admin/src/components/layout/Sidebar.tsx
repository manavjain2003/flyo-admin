import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ShieldCheck,
  KeyRound,
  FileText,
  MapPin,
  Plane,
  UserRound,
  Briefcase,
  Settings,
  SlidersHorizontal,
  ChevronDown,
  PlaneTakeoff,
} from "lucide-react";

interface NavChild {
  label: string;
  to: string;
}

interface NavItem {
  label: string;
  icon: React.ElementType;
  to?: string;
  children?: NavChild[];
}

const APPLICATION: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
];

const SECTIONS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "System Access",
    items: [
      {
        label: "System Access",
        icon: ShieldCheck,
        children: [
          { label: "Admins", to: "/admins" },
          { label: "Roles", to: "/roles" },
          { label: "Permissions", to: "/permissions" },
        ],
      },
    ],
  },
  {
    heading: "Workspace",
    items: [
      { label: "Content", icon: FileText, to: "/content" },
      { label: "Locations", icon: MapPin, to: "/locations" },
      { label: "Aviation", icon: Plane, to: "/aviation" },
      { label: "Travelers", icon: UserRound, to: "/travelers" },
      { label: "Bookings", icon: Briefcase, to: "/bookings" },
      { label: "Configuration", icon: Settings, to: "/configuration" },
      { label: "Advanced", icon: SlidersHorizontal, to: "/advanced" },
    ],
  },
];

function SidebarLink({ item }: { item: NavChild }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `block rounded-md px-3 py-2 text-sm transition-colors ${
          isActive
            ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium"
            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
        }`
      }
    >
      {item.label}
    </NavLink>
  );
}

function SidebarGroup({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(true);
  const Icon = item.icon;

  if (!item.children) {
    return (
      <NavLink
        to={item.to ?? "#"}
        className={({ isActive }) =>
          `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
            isActive
              ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
          }`
        }
      >
        <Icon size={16} />
        {item.label}
      </NavLink>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <Icon size={16} />
          {item.label}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-1 ml-3 flex flex-col gap-0.5 border-l border-[var(--color-border)] pl-3">
          {item.children.map((c) => (
            <SidebarLink key={c.to} item={c} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-[var(--color-border-soft)] bg-[var(--color-surface)] h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[var(--color-border-soft)]">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand)] text-white">
          <PlaneTakeoff size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Flyomint Admin</p>
          <p className="text-xs text-[var(--color-text-muted)] leading-tight">
            Flight Booking Management
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-6">
        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
            Application
          </p>
          <div className="flex flex-col gap-0.5">
            {APPLICATION.map((item) => (
              <SidebarGroup key={item.label} item={item} />
            ))}
          </div>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.heading}>
            <p className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
              {section.heading}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <SidebarGroup key={item.label} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--color-border-soft)] px-3 py-3 flex items-center gap-2">
        <KeyRound size={13} className="text-[var(--color-text-muted)]" />
        <p className="text-[11px] text-[var(--color-text-muted)]">
          Session protected · UniqueKey
        </p>
      </div>
    </aside>
  );
}
