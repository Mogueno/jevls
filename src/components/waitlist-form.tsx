import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { joinWaitlist } from "@/lib/waitlist";

const STORAGE_KEY = "jevls-waitlist";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "joined" | "already">("idle");

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setStatus("already");
    } catch {
      /* ignore */
    }
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    const result = await joinWaitlist({ data: { email } });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStatus(result.status);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (status !== "idle") {
    return (
      <div className="rounded-lg border border-border bg-surface px-5 py-5">
        <p className="text-base font-medium text-fg">You are on the list.</p>
        <p className="mt-1 text-sm text-muted">
          {status === "already"
            ? "That email was already registered. We will write when the LSP opens."
            : "We will send an invite when live-as-you-type lands."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="waitlist-email">
          Email
        </label>
        <input
          id="waitlist-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="h-12 min-h-12 flex-1 rounded-md border border-border bg-surface px-4 text-sm text-fg placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/35"
        />
        <Button type="submit" size="lg" disabled={pending} className="sm:w-44">
          {pending ? "Sending" : "Request access"}
        </Button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </form>
  );
}
