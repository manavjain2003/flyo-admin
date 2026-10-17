import { useEffect, useState } from "react";
import {
  Mail, Phone, ShieldCheck, Eye, Pencil,
  TrendingUp, TrendingDown, Plane, Users,
  Shield, Globe,
  RotateCcw, Navigation, Calendar
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { LoadingState } from "../../components/common/UI";
import { useAuth } from "../../context/AuthContext";
import { getUsers, getRoles } from "../../api/endpoints";

const TODAY_STATS = {
  totalBookings: 1284,
  oneWay: 512,
  roundTrip: 634,
  international: 138,
  change: +8.4,
};

const WEEKLY_BOOKINGS = [
  { day: "Mon", oneWay: 380, roundTrip: 490, international: 95 },
  { day: "Tue", oneWay: 420, roundTrip: 530, international: 110 },
  { day: "Wed", oneWay: 390, roundTrip: 470, international: 88 },
  { day: "Thu", oneWay: 460, roundTrip: 580, international: 125 },
  { day: "Fri", oneWay: 510, roundTrip: 640, international: 145 },
  { day: "Sat", oneWay: 480, roundTrip: 610, international: 130 },
  { day: "Sun", oneWay: 512, roundTrip: 634, international: 138 },
];

const HOURLY_TREND = [
  { hour: "00", bookings: 24 },
  { hour: "02", bookings: 18 },
  { hour: "04", bookings: 12 },
  { hour: "06", bookings: 45 },
  { hour: "08", bookings: 128 },
  { hour: "10", bookings: 184 },
  { hour: "12", bookings: 210 },
  { hour: "14", bookings: 196 },
  { hour: "16", bookings: 220 },
  { hour: "18", bookings: 175 },
  { hour: "20", bookings: 142 },
  { hour: "22", bookings: 88 },
];

const PIE_DATA = [
  { name: "One-Way", value: TODAY_STATS.oneWay, color: "var(--acc-indigo)" },
  { name: "Round-Trip", value: TODAY_STATS.roundTrip, color: "var(--acc-emerald)" },
  { name: "International", value: TODAY_STATS.international, color: "var(--acc-amber)" },
];

const TOP_ROUTES = [
  { route: "DXB → LHR", bookings: 184, pct: 84 },
  { route: "JFK → LAX", bookings: 162, pct: 74 },
  { route: "SIN → SYD", bookings: 143, pct: 65 },
  { route: "CDG → BKK", bookings: 121, pct: 55 },
  { route: "AMS → NYC", bookings: 98,  pct: 45 },
];


function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  trend?: number;
}) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, var(--dash-card) 0%, var(--dash-card-2) 100%)",
        border: "1px solid var(--dash-stat-border)",
        borderRadius: 16,
        padding: "22px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: accent,
          opacity: 0.12,
          filter: "blur(24px)",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: `color-mix(in srgb, ${accent} 14%, transparent)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={18} color={accent} />
        </div>
        {trend !== undefined && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: trend >= 0 ? "var(--dash-pos)" : "var(--dash-neg)",
              background: trend >= 0 ? "color-mix(in srgb, var(--dash-pos) 10%, transparent)" : "color-mix(in srgb, var(--dash-neg) 10%, transparent)",
              borderRadius: 6,
              padding: "2px 8px",
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <div>
        <p style={{ fontSize: 11, color: "var(--dash-muted-2)", marginBottom: 4, letterSpacing: "0.02em" }}>{label}</p>
        <p style={{ fontSize: 28, fontWeight: 700, color: "var(--dash-text)", lineHeight: 1, letterSpacing: "-0.02em" }}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {sub && <p style={{ fontSize: 11, color: "var(--dash-muted)", marginTop: 5 }}>{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--dash-tooltip-bg)",
      border: "1px solid var(--dash-tooltip-border)",
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 12,
    }}>
      <p style={{ color: "var(--dash-text-3)", marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <span style={{ color: "var(--dash-text)", fontWeight: 600 }}>{p.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { profile, isLoading } = useAuth();
  const [userCount, setUserCount] = useState<number | null>(null);
  const [roleCount, setRoleCount] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getUsers(controller.signal)
      .then((r) => setUserCount(r.UserDetails.length))
      .catch((err) => {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
        setUserCount(null);
      });
    getRoles(controller.signal)
      .then((r) => setRoleCount(r.RoleDetails.length))
      .catch((err) => {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
        setRoleCount(null);
      });
    return () => controller.abort();
  }, []);

  if (isLoading) return <LoadingState />;

  const firstName = profile?.Name?.split(" ")[0] ?? null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", color: "var(--dash-text)", padding: "32px 28px", fontFamily: "'Inter', system-ui, sans-serif" }}>

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--dash-pos)", boxShadow: "0 0 8px var(--dash-pos)" }} />
          <span style={{ fontSize: 11, color: "var(--dash-pos)", fontWeight: 600, letterSpacing: "0.06em" }}>
            LIVE · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--dash-text)", margin: 0, letterSpacing: "-0.02em" }}>
          {firstName ? `Good to see you, ${firstName}` : "Dashboard"}
        </h1>
        <p style={{ fontSize: 13, color: "var(--dash-muted)", marginTop: 4 }}>
          Real-time overview of flight bookings and system health
        </p>
      </div>

      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 11, color: "var(--dash-muted)", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 14 }}>
          TODAY'S BOOKINGS
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard icon={Plane}      label="Total Flights Booked" value={TODAY_STATS.totalBookings} accent="var(--acc-indigo)" trend={TODAY_STATS.change} sub="across all routes" />
        <StatCard icon={Navigation} label="One-Way Bookings"     value={TODAY_STATS.oneWay}        accent="var(--acc-sky)" sub={`${Math.round(TODAY_STATS.oneWay / TODAY_STATS.totalBookings * 100)}% of total`} />
        <StatCard icon={RotateCcw}  label="Round-Trip Bookings"  value={TODAY_STATS.roundTrip}     accent="var(--acc-emerald)" sub={`${Math.round(TODAY_STATS.roundTrip / TODAY_STATS.totalBookings * 100)}% of total`} />
        <StatCard icon={Globe}      label="International"        value={TODAY_STATS.international}  accent="var(--acc-amber)" sub="cross-border routes" />
      </div>

      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 11, color: "var(--dash-muted)", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 14 }}>
          SYSTEM
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 36 }}>
        <StatCard icon={Users}       label="Total Admins"  value={userCount ?? "—"} accent="var(--acc-violet)" />
        <StatCard icon={Shield}      label="Total Roles"   value={roleCount ?? "—"} accent="var(--acc-orange)" />
        <StatCard icon={Calendar}    label="Your Role"     value={profile?.RoleName ?? "—"} accent="var(--acc-mint)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18, marginBottom: 18 }}>

        <div style={{ background: "var(--dash-card)", border: "1px solid var(--dash-border)", borderRadius: 16, padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--dash-text)", margin: 0 }}>Weekly Booking Breakdown</p>
              <p style={{ fontSize: 11, color: "var(--dash-muted)", marginTop: 3 }}>One-way · Round-trip · International</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={WEEKLY_BOOKINGS} barSize={18} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--dash-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--dash-muted)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 11, color: "var(--dash-muted-2)", paddingTop: 12 }}
                formatter={(value: string) => <span style={{ color: "var(--dash-muted-2)" }}>{value}</span>}
              />
              <Bar dataKey="oneWay"      name="One-Way"     fill="var(--acc-indigo)" radius={[4,4,0,0]} />
              <Bar dataKey="roundTrip"   name="Round-Trip"  fill="var(--acc-emerald)" radius={[4,4,0,0]} />
              <Bar dataKey="international" name="International" fill="var(--acc-amber)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "var(--dash-card)", border: "1px solid var(--dash-border)", borderRadius: 16, padding: "22px 24px" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--dash-text)", margin: 0, marginBottom: 4 }}>Today's Split</p>
          <p style={{ fontSize: 11, color: "var(--dash-muted)", marginBottom: 16 }}>by booking type</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={PIE_DATA}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
              >
                {PIE_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: any, n: any) => [v.toLocaleString(), n]}
                contentStyle={{ background: "var(--dash-tooltip-bg)", border: "1px solid var(--dash-tooltip-border)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ display: "none" }}
                itemStyle={{ color: "var(--dash-text-2)" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {PIE_DATA.map((d) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                  <span style={{ fontSize: 12, color: "var(--dash-text-3)" }}>{d.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dash-text)" }}>{d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 18, marginBottom: 18 }}>

        <div style={{ background: "var(--dash-card)", border: "1px solid var(--dash-border)", borderRadius: 16, padding: "22px 24px" }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--dash-text)", margin: 0 }}>Hourly Booking Trend</p>
            <p style={{ fontSize: 11, color: "var(--dash-muted)", marginTop: 3 }}>Today · bookings per 2-hour window</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={HOURLY_TREND}>
              <defs>
                <linearGradient id="bookGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--acc-indigo)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--acc-indigo)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "var(--dash-muted)" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v}:00`} />
              <YAxis tick={{ fontSize: 11, fill: "var(--dash-muted)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="bookings"
                name="Bookings"
                stroke="var(--acc-indigo)"
                strokeWidth={2}
                fill="url(#bookGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "var(--acc-indigo)", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "var(--dash-card)", border: "1px solid var(--dash-border)", borderRadius: 16, padding: "22px 24px" }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--dash-text)", margin: 0 }}>Top Routes Today</p>
            <p style={{ fontSize: 11, color: "var(--dash-muted)", marginTop: 3 }}>by bookings volume</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {TOP_ROUTES.map((r, i) => (
              <div key={r.route}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: "var(--dash-muted)", width: 14 }}>#{i + 1}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dash-text-2)", letterSpacing: "0.02em" }}>{r.route}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--dash-text)" }}>{r.bookings}</span>
                </div>
                <div style={{ height: 4, background: "var(--dash-inset)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${r.pct}%`,
                    borderRadius: 4,
                    background: `linear-gradient(90deg, var(--acc-indigo), var(--acc-indigo-2))`,
                    transition: "width 0.6s ease",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: "var(--dash-card)", border: "1px solid var(--dash-border)", borderRadius: 16, padding: "24px 26px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--dash-text)", margin: 0 }}>Your Profile</p>
            <p style={{ fontSize: 11, color: "var(--dash-muted)", marginTop: 3 }}>Account details and permissions</p>
          </div>
          <div style={{
            background: "color-mix(in srgb, var(--acc-indigo) 14%, transparent)",
            border: "1px solid color-mix(in srgb, var(--acc-indigo) 28%, transparent)",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 11,
            color: "var(--dash-indigo-text)",
            fontWeight: 600,
          }}>
            {profile?.RoleName ?? "—"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 24 }}>
          {[
            { Icon: Mail,        val: profile?.Email,    label: "Email" },
            { Icon: Phone,       val: profile?.Phone,    label: "Phone" },
            { Icon: ShieldCheck, val: profile?.RoleName, label: "Role" },
          ].map(({ Icon, val, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "var(--dash-inset)",
                border: "1px solid var(--dash-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={14} color="var(--dash-muted)" />
              </div>
              <div>
                <p style={{ fontSize: 10, color: "var(--dash-muted)", margin: 0 }}>{label}</p>
                <p style={{ fontSize: 13, color: "var(--dash-text-2)", margin: 0, fontWeight: 500 }}>{val ?? "—"}</p>
              </div>
            </div>
          ))}
        </div>

        {!!profile?.Views?.length && (
          <>
            <div style={{ height: 1, background: "var(--dash-border)", marginBottom: 20 }} />
            <p style={{ fontSize: 11, color: "var(--dash-muted)", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 12 }}>
              ACCESS PERMISSIONS
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {profile.Views.map((v) => (
                <span
                  key={v.ViewId}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "var(--dash-inset)",
                    border: "1px solid var(--dash-border)",
                    borderRadius: 8,
                    padding: "5px 12px",
                    fontSize: 12,
                    color: "var(--dash-text-3)",
                    fontWeight: 500,
                  }}
                >
                  {v.ViewName}
                  {v.Permission.includes("R") && <Eye size={10} color="var(--dash-muted)" />}
                  {v.Permission.includes("W") && <Pencil size={10} color="var(--acc-indigo)" />}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  );
}