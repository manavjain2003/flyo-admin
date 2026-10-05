const pad = (n: number) => String(n).padStart(2, "0");

export const toInputDate = (d: Date = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const createdDateToInput = (s: string) => {
  const m = s?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? `${m[3]}-${pad(+m[1])}-${pad(+m[2])}` : "";
};