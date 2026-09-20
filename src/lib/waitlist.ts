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

    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const res = await db
      .prepare(
        "insert into waitlist (email) values (?) on conflict (email) do nothing",
      )
      .bind(email)
      .run();
    return {
      ok: true,
      status: res.meta.changes > 0 ? "joined" : "already",
    };
  });
