import { cn } from "@/lib/utils";

export function Gem({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-5 text-gem", className)}
      aria-hidden="true"
    >
      <polygon points="16,4 27,14 16,28 5,14" fill="currentColor" />
    </svg>
  );
}
