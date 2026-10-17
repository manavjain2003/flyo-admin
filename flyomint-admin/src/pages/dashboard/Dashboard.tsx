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
  { name: "One-Way", value: TODAY_STATS.oneWay, color: "#6366F1" },
  { name: "Round-Trip", value: TODAY_STATS.roundTrip, color: "#10B981" },
  { name: "International", value: TODAY_STATS.international, color: "#F59E0B" },
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
        background: "linear-gradient(135deg, #1E293B 0%, #162032 100%)",
        border: "1px solid rgba(99,102,241,0.15)",
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
            background: accent + "22",
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
              color: trend >= 0 ? "#10B981" : "#F43F5E",
              background: trend >= 0 ? "#10B98118" : "#F43F5E18",
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
        <p style={{ fontSize: 11, color: "#64748B", marginBottom: 4, letterSpacing: "0.02em" }}>{label}</p>
        <p style={{ fontSize: 28, fontWeight: 700, color: "#F1F5F9", lineHeight: 1, letterSpacing: "-0.02em" }}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {sub && <p style={{ fontSize: 11, color: "#475569", marginTop: 5 }}>{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0F172A",
      border: "1px solid #334155",
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 12,
    }}>
      <p style={{ color: "#94A3B8", marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <span style={{ color: "#F1F5F9", fontWeight: 600 }}>{p.value?.toLocaleString()}</span>
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
    <div style={{ minHeight: "100vh", background: "rgb(10 10 12)", color: "#F1F5F9", padding: "32px 28px", fontFamily: "'Inter', system-ui, sans-serif" }}>

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 8px #10B981" }} />
          <span style={{ fontSize: 11, color: "#10B981", fontWeight: 600, letterSpacing: "0.06em" }}>
            LIVE · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#F1F5F9", margin: 0, letterSpacing: "-0.02em" }}>
          {firstName ? `Good to see you, ${firstName}` : "Dashboard"}
        </h1>
        <p style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
          Real-time overview of flight bookings and system health
        </p>
      </div>

      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 11, color: "#475569", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 14 }}>
          TODAY'S BOOKINGS
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard icon={Plane}      label="Total Flights Booked" value={TODAY_STATS.totalBookings} accent="#6366F1" trend={TODAY_STATS.change} sub="across all routes" />
        <StatCard icon={Navigation} label="One-Way Bookings"     value={TODAY_STATS.oneWay}        accent="#38BDF8" sub={`${Math.round(TODAY_STATS.oneWay / TODAY_STATS.totalBookings * 100)}% of total`} />
        <StatCard icon={RotateCcw}  label="Round-Trip Bookings"  value={TODAY_STATS.roundTrip}     accent="#10B981" sub={`${Math.round(TODAY_STATS.roundTrip / TODAY_STATS.totalBookings * 100)}% of total`} />
        <StatCard icon={Globe}      label="International"        value={TODAY_STATS.international}  accent="#F59E0B" sub="cross-border routes" />
      </div>

      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 11, color: "#475569", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 14 }}>
          SYSTEM
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 36 }}>
        <StatCard icon={Users}       label="Total Admins"  value={userCount ?? "—"} accent="#A78BFA" />
        <StatCard icon={Shield}      label="Total Roles"   value={roleCount ?? "—"} accent="#FB923C" />
        <StatCard icon={Calendar}    label="Your Role"     value={profile?.RoleName ?? "—"} accent="#34D399" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18, marginBottom: 18 }}>

        <div style={{ background: "#1E293B", border: "1px solid #1E3A5A", borderRadius: 16, padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#F1F5F9", margin: 0 }}>Weekly Booking Breakdown</p>
              <p style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>One-way · Round-trip · International</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={WEEKLY_BOOKINGS} barSize={18} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5A" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 11, color: "#64748B", paddingTop: 12 }}
              />
              <Bar dataKey="oneWay"      name="One-Way"     fill="#6366F1" radius={[4,4,0,0]} />
              <Bar dataKey="roundTrip"   name="Round-Trip"  fill="#10B981" radius={[4,4,0,0]} />
              <Bar dataKey="international" name="International" fill="#F59E0B" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#1E293B", border: "1px solid #1E3A5A", borderRadius: 16, padding: "22px 24px" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#F1F5F9", margin: 0, marginBottom: 4 }}>Today's Split</p>
          <p style={{ fontSize: 11, color: "#475569", marginBottom: 16 }}>by booking type</p>
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
                contentStyle={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ display: "none" }}
                itemStyle={{ color: "#CBD5E1" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {PIE_DATA.map((d) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>{d.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#F1F5F9" }}>{d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 18, marginBottom: 18 }}>

        <div style={{ background: "#1E293B", border: "1px solid #1E3A5A", borderRadius: 16, padding: "22px 24px" }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#F1F5F9", margin: 0 }}>Hourly Booking Trend</p>
            <p style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>Today · bookings per 2-hour window</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={HOURLY_TREND}>
              <defs>
                <linearGradient id="bookGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5A" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v}:00`} />
              <YAxis tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="bookings"
                name="Bookings"
                stroke="#6366F1"
                strokeWidth={2}
                fill="url(#bookGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#6366F1", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#1E293B", border: "1px solid #1E3A5A", borderRadius: 16, padding: "22px 24px" }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#F1F5F9", margin: 0 }}>Top Routes Today</p>
            <p style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>by bookings volume</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {TOP_ROUTES.map((r, i) => (
              <div key={r.route}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: "#475569", width: 14 }}>#{i + 1}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#CBD5E1", letterSpacing: "0.02em" }}>{r.route}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#F1F5F9" }}>{r.bookings}</span>
                </div>
                <div style={{ height: 4, background: "#0F172A", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${r.pct}%`,
                    borderRadius: 4,
                    background: `linear-gradient(90deg, #6366F1, #818CF8)`,
                    transition: "width 0.6s ease",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: "#1E293B", border: "1px solid #1E3A5A", borderRadius: 16, padding: "24px 26px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#F1F5F9", margin: 0 }}>Your Profile</p>
            <p style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>Account details and permissions</p>
          </div>
          <div style={{
            background: "#6366F122",
            border: "1px solid #6366F144",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 11,
            color: "#818CF8",
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
                background: "#0F172A",
                border: "1px solid #1E3A5A",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={14} color="#475569" />
              </div>
              <div>
                <p style={{ fontSize: 10, color: "#475569", margin: 0 }}>{label}</p>
                <p style={{ fontSize: 13, color: "#CBD5E1", margin: 0, fontWeight: 500 }}>{val ?? "—"}</p>
              </div>
            </div>
          ))}
        </div>

        {!!profile?.Views?.length && (
          <>
            <div style={{ height: 1, background: "#1E3A5A", marginBottom: 20 }} />
            <p style={{ fontSize: 11, color: "#475569", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 12 }}>
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
                    background: "#0F172A",
                    border: "1px solid #1E3A5A",
                    borderRadius: 8,
                    padding: "5px 12px",
                    fontSize: 12,
                    color: "#94A3B8",
                    fontWeight: 500,
                  }}
                >
                  {v.ViewName}
                  {v.Permission.includes("R") && <Eye size={10} color="#475569" />}
                  {v.Permission.includes("W") && <Pencil size={10} color="#6366F1" />}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  );
}