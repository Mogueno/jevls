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
        <section className="flex max-w-3xl flex-col gap-6">
          <p className="stagger-in font-mono text-xs uppercase tracking-wider text-subtle">
            Live code verification for the agent era
          </p>
          <h1 className="stagger-in text-4xl font-medium leading-tight tracking-tight text-fg sm:text-5xl">
            Know where to look before you trust the code.
          </h1>
          <p className="stagger-in max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Agents can write a lot of code before you can read it. jevls checks each change in under
            a second and returns a health score, likely issue type, and probability - so you know
            what deserves attention first. No chat. No paragraph to parse.
          </p>
          <div className="stagger-in flex flex-wrap gap-3">
            <Button asChild>
              <a href="#try">Watch it score code</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="#access">Join the $10 beta</a>
            </Button>
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
