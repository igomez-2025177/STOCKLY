export const ALLOWED_EMAIL_DOMAINS = ["gmail.com", "hotmail.com", "outlook.com", "kinal.edu.gt"];
export const MIN_PASSWORD = 8;

export function isEmailDomainAllowed(correo: string): boolean {
  const domain = correo.split("@")[1]?.toLowerCase();
  return !!domain && ALLOWED_EMAIL_DOMAINS.includes(domain);
}

export function limpiarCorreo(correo: unknown): string {
  return String(correo ?? "").trim().toLowerCase();
}