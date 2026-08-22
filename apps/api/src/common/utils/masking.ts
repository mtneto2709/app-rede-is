/**
 * Mascaramento de dados sensíveis exibidos ao usuário durante o
 * questionário de primeiro acesso (ex.: para ele escolher qual cadastro é
 * o seu, sem expor o dado completo de terceiros).
 */

/** "João Pedro Silva" -> "J*** P**** S****" */
export function maskName(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .map((part) => (part.length <= 1 ? part : `${part[0]}${"*".repeat(part.length - 1)}`))
    .join(" ");
}

/** "12345678900" -> "123.***.**8-00" (mostra os 3 primeiros e os 2 últimos dígitos) */
export function maskCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, "").padStart(11, "0");
  return `${digits.slice(0, 3)}.***.**${digits.slice(9, 10)}-${digits.slice(10, 11).padStart(1, "0")}`;
}

/** "11987654321" -> "(11) 9****-4321" */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return "*".repeat(digits.length);
  const ddd = digits.slice(0, 2);
  const last4 = digits.slice(-4);
  return `(${ddd}) 9****-${last4}`;
}

/** "joao.silva@exemplo.com" -> "jo***@exemplo.com" */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}${"*".repeat(Math.max(user.length - visible.length, 3))}@${domain}`;
}
