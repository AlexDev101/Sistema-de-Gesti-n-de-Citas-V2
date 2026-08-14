import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  crons: [
    // Recordatorio 24h antes. El plan Hobby de Vercel solo permite crons
    // diarios (no cada hora) — corre una vez al día a las 08:00 UTC
    // (~10:00 Madrid en verano) y revisa la ventana de ~25h desde ese
    // momento, así que cubre todas las citas de "mañana" en una sola pasada.
    { path: "/api/cron/recordatorios", schedule: "0 8 * * *" },
  ],
};
