/**
 * Cloudflare Pages Function — POST /api/lead
 *
 * Nimmt einen Lead als JSON entgegen ({ firstName | name, email }),
 * validiert die Felder und gibt Erfolg zurück.
 * Ist die Umgebungsvariable LEAD_WEBHOOK_URL gesetzt, wird der Lead
 * zusätzlich per POST an diese URL weitergeleitet.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Body parsen
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "Ungültiger JSON-Body." }, 400);
  }

  // Felder normalisieren (Formular sendet firstName; "name" wird ebenfalls akzeptiert)
  const name = String(data.firstName ?? data.name ?? "").trim();
  const email = String(data.email ?? "").trim();

  // Validierung
  if (!name || !email) {
    return json({ ok: false, error: "Name und E-Mail sind erforderlich." }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: "Bitte eine gültige E-Mail-Adresse angeben." }, 400);
  }

  const lead = {
    name,
    email,
    receivedAt: new Date().toISOString(),
  };

  // Optionale Weiterleitung an Webhook
  if (env.LEAD_WEBHOOK_URL) {
    try {
      const res = await fetch(env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
      if (!res.ok) {
        return json(
          { ok: false, error: "Weiterleitung an den Webhook fehlgeschlagen." },
          502
        );
      }
    } catch {
      return json(
        { ok: false, error: "Webhook nicht erreichbar." },
        502
      );
    }
  }

  return json({ ok: true, message: "Lead erfolgreich empfangen." }, 200);
}
