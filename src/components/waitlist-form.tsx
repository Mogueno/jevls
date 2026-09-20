import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { joinWaitlist } from "@/lib/waitlist";

const STORAGE_KEY = "jevls-waitlist";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [workflow, setWorkflow] = useState("");
  const [surface, setSurface] = useState("");
  const [purchaseSignal, setPurchaseSignal] = useState("");
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
    // The beta research fields are collected in the UI for now. The existing
    // waitlist endpoint still stores email only.
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
        <p className="text-base font-medium text-fg">You are on the test list.</p>
        <p className="mt-1 text-sm text-muted">
          {status === "already"
            ? "That email was already registered. I will send the first build when the live signal works in your workflow."
            : "I will send the first build when the live signal works in your workflow."}
        </p>
      </div>
    );
  }

  const fieldClass =
    "h-12 min-h-12 w-full rounded-md border border-border bg-surface px-4 text-sm text-fg placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/35";

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm text-muted" htmlFor="waitlist-email">
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
          className={fieldClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm text-muted" htmlFor="waitlist-workflow">
            Workflow
          </label>
          <select
            id="waitlist-workflow"
            required
            value={workflow}
            onChange={(e) => setWorkflow(e.target.value)}
            className={fieldClass}
          >
            <option value="" disabled>
              Choose your coding agent
            </option>
            <option>Claude Code</option>
            <option>Cursor</option>
            <option>Codex</option>
            <option>Copilot</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-muted" htmlFor="waitlist-surface">
            Primary surface
          </label>
          <select
            id="waitlist-surface"
            required
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
            className={fieldClass}
          >
            <option value="" disabled>
              Where should the signal appear?
            </option>
            <option>Inside the agent loop</option>
            <option>In my editor</option>
            <option>On save</option>
            <option>Before commit</option>
          </select>
        </div>
      </div>

      <fieldset className="rounded-lg border border-border bg-surface p-4">
        <legend className="px-1 text-sm text-muted">Would you try this at $10/month?</legend>
        <div className="mt-2 flex flex-col gap-2">
          {[
            "Yes, I would try this at $10/month",
            "Maybe, show me first",
            "No, I only want a free version",
          ].map((option) => (
            <label key={option} className="flex items-start gap-3 text-sm text-fg">
              <input
                type="radio"
                name="purchase-signal"
                required
                value={option}
                checked={purchaseSignal === option}
                onChange={(e) => setPurchaseSignal(e.target.value)}
                className="mt-0.5 size-4 accent-current"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Button type="submit" size="lg" disabled={pending} className="sm:w-48">
        {pending ? "Sending" : "Join the $10 beta"}
      </Button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </form>
  );
}
