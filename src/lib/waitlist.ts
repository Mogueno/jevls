import { createServerFn } from "@tanstack/react-start";

export type WaitlistResult =
  | { ok: true; status: "joined" | "already" }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (email.length < 5 || email.length > 254) return null;
  if (!EMAIL_RE.test(email)) return null;
  return email;
}

export const joinWaitlist = createServerFn({ method: "POST" })
  .validator((input: unknown) => input)
  .handler(async ({ data }): Promise<WaitlistResult> => {
    const raw =
      data && typeof data === "object"
        ? (data as { email?: unknown }).email
        : undefined;
    if (typeof raw !== "string") {
      return { ok: false, error: "Enter an email." };
    }
    const email = normalizeEmail(raw);
    if (!email) return { ok: false, error: "That email does not look valid." };

    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ id: number }>`
      insert into waitlist (email) values (${email})
      on conflict (email) do nothing
      returning id
    `;
    return {
      ok: true,
      status: rows.length > 0 ? "joined" : "already",
    };
  });
