export const fmtCurrency = (n: number, currency: "USD" | "MXN", locale: string = "es-MX") =>
  new Intl.NumberFormat(locale === "en" ? "en-US" : "es-MX", { style: "currency", currency }).format(n);

export const daysLeft = (deadlineISO: string) => {
  const now = new Date();
  const deadline = new Date(deadlineISO);
  const diff = deadline.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const shortDate = (iso: string, locale: string = "es-MX") => 
  new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "es-MX", { year: "numeric", month: "short", day: "numeric" });

