import { PlaneTakeoff } from "lucide-react";

export function AuthBrandPanel() {
  return (
    <div className="hidden md:flex flex-col justify-center flex-1 relative overflow-hidden bg-gradient-to-br from-[#3b1a6b] via-[#5b21b6] to-[#a4145a] px-16">
      <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-black/10 blur-3xl" />

      <div className="relative z-10 max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <PlaneTakeoff size={18} className="text-white" />
          </div>
          <span className="text-xs font-semibold tracking-widest text-white/70 uppercase">
            Flyomint Admin
          </span>
        </div>
        <h1 className="text-4xl font-bold text-white leading-tight mb-4">
          Flight Booking Management
        </h1>
        <p className="text-white/80 text-sm leading-relaxed">
          Secure admin panel for managing Flyomint flight bookings, fares,
          content and system configuration.
        </p>
      </div>
    </div>
  );
}
