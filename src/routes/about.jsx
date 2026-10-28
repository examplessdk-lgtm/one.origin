import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bot, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — ONEORIGIN" },
      { name: "description", content: "ONEORIGIN is building an AI assistant platform where every idea has an origin." },
    ],
  }),
  component: AboutPage,
});

const values = [
  {
    icon: Bot,
    title: "One agent, every medium",
    body: "Text, images, audio and video belong in the same conversation. We build for the way ideas actually arrive — mixed, unfinished, and fast.",
  },
  {
    icon: ShieldCheck,
    title: "Your work stays yours",
    body: "Everything the agent creates is saved to your own workspace, readable only by you. No training on your content, no silent sharing.",
  },
  {
    icon: Sparkles,
    title: "Built for builders",
    body: "From the browser to the terminal, the same agent follows you. Less setup, less friction, more time spent on the work itself.",
  },
];

function AboutPage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[360px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[320px] h-[320px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative max-w-4xl mx-auto px-6 py-20 md:py-28 text-center"
        >
          <p className="text-[10px] tracking-[0.4em] font-bold text-accent mb-5">ABOUT ONEORIGIN</p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Every idea deserves
            <br className="hidden sm:block" /> a place to begin.
          </h1>
          <p className="text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed">
            ONEORIGIN is an AI-native workspace where a single intelligent agent helps you think, write,
            design and build — in the browser, in your terminal, and in any language.
          </p>
        </motion.div>
      </section>

      <section className="border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24 grid gap-12 md:grid-cols-2">
          <div>
            <p className="text-[10px] tracking-[0.3em] font-bold text-accent mb-4">OUR VISION</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-snug">
              A single origin for every conversation with AI.
            </h2>
          </div>
          <div className="space-y-5 text-sm md:text-base text-muted-foreground leading-relaxed">
            <p>
              Today's tools split your work across tabs, apps and formats. We believe the assistant should
              follow the idea instead — remembering your context, understanding every medium, and picking up
              exactly where you left off.
            </p>
            <p>
              So we built one agent and one workspace around it: a shared place where what you make is kept,
              revisited and refined. One origin, infinite possibilities.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-border/50 bg-secondary/30">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <p className="text-[10px] tracking-[0.3em] font-bold text-accent mb-4">OUR COMMITMENT</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-10">What we hold ourselves to.</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {values.map((v) => (
              <div key={v.title} className="rounded-2xl border border-border/60 bg-card p-6">
                <div className="w-10 h-10 rounded-xl border border-accent/30 bg-background flex items-center justify-center text-accent mb-6">
                  <v.icon className="w-4 h-4" />
                </div>
                <h3 className="font-semibold mb-2 text-sm">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[520px] h-[260px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight">Start where your next idea begins.</h2>
          <p className="text-muted-foreground mt-4">Talk to the agent, or create an account to keep your work.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-foreground text-background hover:bg-foreground/90 h-11 px-6 rounded-full">
              <Link to="/Agent">
                Meet the agent <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 px-6 rounded-full border-border bg-transparent hover:bg-secondary">
              <Link to="/register">Create an account</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
