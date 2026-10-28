import { Link } from "@tanstack/react-router";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M2 20 L9 6 L13 14 L16 9 L22 20 Z" /></svg>
          <span className="font-bold tracking-tight">ONEORIGIN</span>
        </Link>
        <span className="text-xs text-muted-foreground">One origin. Infinite possibilities.</span>
        <small className="text-xs text-muted-foreground">© 2026 ONEORIGIN</small>
      </div>
    </footer>
  );
}
