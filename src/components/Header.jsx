import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Moon, Sun, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/AuthContext";

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 text-foreground group">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="transition-transform group-hover:scale-110">
        <path d="M2 20 L9 6 L13 14 L16 9 L22 20 Z" />
      </svg>
      <span className="font-bold text-lg tracking-tight">ONEORIGIN</span>
    </Link>
  );
}

export default function Header() {
  const [dark, setDark] = useState(true);
  const { user } = useAuth();
  
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl text-foreground transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Brand />
        <nav className="hidden xl:flex items-center gap-6 text-xs font-medium text-muted-foreground">
          <a href="/#features" className="hover:text-foreground hover:-translate-y-0.5 transition-all">Features</a>
          <Link to="/Agent" className="hover:text-primary hover:-translate-y-0.5 transition-all flex items-center gap-1">
            Agent
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          </Link>
          <Link to="/about" className="hover:text-foreground hover:-translate-y-0.5 transition-all">About</Link>
          {user && (
            <>
              <Link to="/workspace" className="hover:text-foreground hover:-translate-y-0.5 transition-all">Workspace</Link>
              <Link to="/settings" className="hover:text-foreground hover:-translate-y-0.5 transition-all">Settings</Link>
            </>
          )}
          <Link to="/hosting" className="hover:text-foreground transition-all">Hosting</Link>
          <a href="/#templates" className="hover:text-foreground hover:-translate-y-0.5 transition-all">Templates</a>
          <a href="/#pricing" className="hover:text-foreground hover:-translate-y-0.5 transition-all">Pricing</a>
          <a href="/#testimonials" className="hover:text-foreground hover:-translate-y-0.5 transition-all">Testimonials</a>
          <a href="/#faq" className="hover:text-foreground hover:-translate-y-0.5 transition-all">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Toggle color theme" onClick={() => setDark(!dark)} className="text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-full transition-colors">
            {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <a href="https://github.com/" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-full transition-all">
            <Github className="h-4 w-4" />
          </a>
          <Sheet>
            <SheetTrigger asChild className="xl:hidden">
              <Button variant="ghost" size="icon" className="hover:bg-secondary/50 rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-background/95 backdrop-blur-xl text-foreground border-border/50 w-72 max-w-full">
              <nav className="flex flex-col gap-6 mt-12 text-sm font-medium">
                <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                <Link to="/Agent" className="hover:text-primary transition-colors flex items-center justify-between">
                  Multimodal Agent <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">New</span>
                </Link>
                <Link to="/hosting" className="hover:text-primary transition-colors">Hosting</Link>
                <Link to="/about" className="hover:text-primary transition-colors">About</Link>
                {user && (
                  <>
                    <Link to="/workspace" className="hover:text-primary transition-colors">Workspace</Link>
                    <Link to="/settings" className="hover:text-primary transition-colors">Settings</Link>
                  </>
                )}
                <a href="/#features" className="hover:text-primary transition-colors">Features</a>
                <a href="/#templates" className="hover:text-primary transition-colors">Templates</a>
                <a href="/#pricing" className="hover:text-primary transition-colors">Pricing</a>
                <a href="/#testimonials" className="hover:text-primary transition-colors">Testimonials</a>
                <a href="/#faq" className="hover:text-primary transition-colors">FAQ</a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
