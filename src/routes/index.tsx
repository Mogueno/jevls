import { createFileRoute } from "@tanstack/react-router";
import { Gem } from "@/components/gem";
import { Tryout } from "@/components/tryout";
import { Button } from "@/components/ui/button";
import { WaitlistForm } from "@/components/waitlist-form";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-border bg-bg">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <a href="#top" className="flex items-center gap-2 text-fg">
            <Gem className="size-4" />
            <span className="font-mono text-sm tracking-tight">jevls</span>
          </a>
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <a href="#try">Live demo</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="#access">Join the test</a>
            </Button>
          </nav>
        </div>
      </header>

      <main
        id="top"
        className="mx-auto flex max-w-5xl flex-col gap-20 px-4 py-12 sm:px-6 sm:py-16 lg:gap-28 lg:py-24"
      >
        <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(25rem,0.92fr)] lg:gap-14">
          <div className="flex flex-col gap-6">
            <div className="stagger-in flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
              <span className="size-1.5 rounded-[2px] bg-ok" />
              Live code verification for the agent era
            </div>
            <h1 className="stagger-in max-w-3xl text-[2.7rem] font-medium leading-[1.04] tracking-[-0.035em] text-fg sm:text-6xl lg:text-[4rem]">
              Know where to look before you trust the code.
            </h1>
            <p className="stagger-in max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
              Agents can write a lot of code before you can read it. jevls checks each change in under
              a second and shows what is wrong, where it lives, and how sure the signal is. No chat.
              No paragraph to parse.
            </p>
            <div className="stagger-in flex flex-wrap gap-3">
              <Button asChild>
                <a href="#try">Watch it score code</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="#access">Join the $10 beta</a>
              </Button>
            </div>
          </div>

          <div
            className="stagger-in overflow-hidden border border-border bg-surface"
            aria-label="Example jevls security diagnostic"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-[2px] bg-danger" />
                <span className="font-mono text-xs text-fg">auth.ts</span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">
                Analysis complete · 184ms
              </span>
            </div>

            <div className="bg-bg py-3 font-mono text-[12px] leading-6 sm:text-[13px]">
              {[
                ["01", "export function getUser(id: string) {"],
                ["02", "  const query = `SELECT * FROM users"],
                ["03", "    WHERE id = '${id}'`;"],
                ["04", "  return db.exec(query);"],
                ["05", "}"],
              ].map(([line, code]) => {
                const flagged = line === "02" || line === "03" || line === "04";
                return (
                  <div
                    key={line}
                    className={flagged ? "grid grid-cols-[2.75rem_1fr] bg-danger/10" : "grid grid-cols-[2.75rem_1fr]"}
                  >
                    <span className="relative border-r border-border pr-3 text-right tabular-nums text-subtle">
                      {line}
                      {line === "04" ? (
                        <span className="absolute right-[-4px] top-[9px] size-[7px] rounded-[2px] bg-danger" />
                      ) : null}
                    </span>
                    <span className="overflow-hidden px-4 whitespace-pre text-muted">
                      {code}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex items-start gap-3">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-[3px] bg-danger" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-danger">
                      Security
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-muted">Lines 02–04</span>
                  </div>
                  <p className="mt-1.5 font-semibold leading-snug text-fg">User input reaches a SQL query</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Interpolating the id allows crafted input to change the query. Use a parameterized statement.
                  </p>
                  <p className="mt-2 font-mono text-[10px] text-subtle">High confidence · 94%</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Tryout />

        <section className="grid gap-6 sm:grid-cols-2">
          {(
            [
              {
                k: "A signal that keeps up",
                d: "jevls returns typed scores in hundreds of milliseconds. The result can update as code changes instead of waiting for a full review.",
              },
              {
                k: "Probability, not fake certainty",
                d: "See how strongly Jev leans toward bug, security, secret, type issue, or clean. Use the signal to choose where to inspect - not as proof that the code is safe.",
              },
              {
                k: "Built for code you did not write",
                d: "Put it after an agent edit, before the diff review, or beside the code you are reading. It gives you a fast first pass before slower tools take over.",
              },
              {
                k: "A second opinion, not a green light",
                d: "jevls does not replace tests, linters, security scanners, or human review. It helps you decide where to spend those next minutes.",
              },
            ] as const
          ).map((item) => (
            <article key={item.k} className="rounded-lg border border-border bg-surface px-5 py-5">
              <h2 className="font-mono text-sm font-medium text-fg">{item.k}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.d}</p>
            </article>
          ))}
        </section>

        <section id="access" className="scroll-mt-24 max-w-xl">
          <p className="font-mono text-xs uppercase tracking-wider text-subtle">Paid beta test</p>
          <h2 className="mt-2 text-2xl font-medium tracking-tight text-fg sm:text-3xl">
            Would you pay $10/month for this beside your coding agent?
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            I am testing an always-on version for people reviewing agent-written code. It would
            score changes as they land in your editor or agent loop. Join only if you would
            seriously try it at $10/month. No charge today.
          </p>
          <div className="mt-6">
            <WaitlistForm />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-mono text-xs text-subtle">jevls</p>
          <p className="text-xs text-subtle">
            Fast code signals powered by Jev · TypeSafe System One
          </p>
        </div>
      </footer>
    </div>
  );
}
