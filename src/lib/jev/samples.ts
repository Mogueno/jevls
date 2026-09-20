import type { LanguageId } from "./types";

export type Sample = {
  id: string;
  title: string;
  language: LanguageId;
  code: string;
};

export const SAMPLES: Sample[] = [
  {
    id: "xss",
    title: "Profile render",
    language: "javascript",
    code: `export function renderProfile(user) {
  const root = document.getElementById("main");
  root.innerHTML = "<h1>" + user.name + "</h1><div>" + user.bio + "</div>";

  eval(user.onLoad);

  fetch("https://api.internal.corp/v1/me?key=sk_live_91a8ffc2")
    .then((r) => r.json())
    .then((data) => {
      localStorage.token = data.token;
      window.password = data.password;
    });
}
`,
  },
  {
    id: "sql",
    title: "Login query",
    language: "python",
    code: `def login(db, username, password):
    q = "SELECT * FROM users WHERE name = '" + username + "' AND pw = '" + password + "'"
    row = db.execute(q).fetchone()
    token = "secret-prod-key-please-dont-commit"
    return {"user": row, "token": token}
`,
  },
  {
    id: "stale",
    title: "Cart total",
    language: "typescript",
    code: `import { useEffect, useState } from "react";

export function Cart({ items }: { items: number[] }) {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setTotal(items.reduce((a, b) => a + b, 0));
  }, []);

  return (
    <button onClick={() => setTotal(total + 1)}>
      Checkout {total}
    </button>
  );
}
`,
  },
  {
    id: "clean",
    title: "Clamp",
    language: "typescript",
    code: `export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n) || !Number.isFinite(min) || !Number.isFinite(max)) {
    throw new TypeError("clamp expects finite numbers");
  }
  if (min > max) throw new RangeError("min must be <= max");
  return Math.min(max, Math.max(min, n));
}
`,
  },
];

export const DEFAULT_SAMPLE = SAMPLES[0]!;
