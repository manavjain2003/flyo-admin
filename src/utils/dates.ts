const pad = (n: number) => String(n).padStart(2, "0");

export const toInputDate = (d: Date = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const createdDateToInput = (s: string) => {
  const m = s?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? `${m[3]}-${pad(+m[1])}-${pad(+m[2])}` : "";
};

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const parseCreatedDate = (s: string) => {
  const m = s?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if (!m) return null;
  let h = +m[4];
  const ap = m[6]?.toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return { year: +m[3], month: +m[1], day: +m[2], hour: h, minute: +m[5] };
};

export const createdDateToKey = (s: string) => {
  const p = parseCreatedDate(s);
  return p ? `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}` : "";
};

export const createdDateToDisplay = (s: string) => {
  const p = parseCreatedDate(s);
  return p
    ? `${pad(p.day)} ${MONTHS_SHORT[p.month - 1]} ${p.year}, ${pad(p.hour)}:${pad(p.minute)}`
    : "";
};