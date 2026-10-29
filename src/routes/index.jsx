import { applicationSchema, site } from "@/lib/site-content";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, ArrowUpRight, Diamond, LayoutGrid, Plus, Minus, Terminal, Globe, Image as ImageIcon, Mic, Video, Type, MessagesSquare, PenLine, Code2, Users } from "lucide-react";

const HERO_LOGO = "https://media.base44.com/images/public/6ae19df388768a7d60e9828e/5aa3a2d53_golden-wind-13124120_figma_site_oneorigin-logo_5b37b9d1.png";

const AnimatedElement = ({ children, className = "", delay = 0 }) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) { setIsVisible(true); return; }
    const fallback = setTimeout(() => setIsVisible(true), 800 + delay);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        clearTimeout(fallback);
        setTimeout(() => setIsVisible(true), delay);
        observer.unobserve(el);
      }
    }, { threshold: 0.1, rootMargin: "0px 0px 100px 0px" });
    observer.observe(el);
    return () => { observer.disconnect(); clearTimeout(fallback); };
  }, [delay]);
  return (
    <div data-home-reveal="" ref={ref} className={`transition-all duration-1000 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"} ${className}`}>
      {children}
    </div>
  );
};

const iconMap = { Diamond, ArrowUpRight, LayoutGrid, MessagesSquare, PenLine, Code2, Users };

function HeroSection() {
  return (
    <section className="relative overflow-x-clip min-h-[90vh] flex flex-col items-center justify-center border-b border-border/40">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/10 rounded-full blur-[160px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[140px] pointer-events-none" />
      
      {/* Floating particles */}
      <div className="absolute top-[20%] left-[15%] w-1.5 h-1.5 rounded-full bg-primary/60 pointer-events-none" style={{ animation: "floatA 7s ease-in-out infinite" }} />
      <div className="absolute top-[30%] right-[20%] w-2 h-2 rounded-full bg-accent/80 pointer-events-none" style={{ animation: "floatB 9s ease-in-out 1s infinite" }} />
      <div className="absolute bottom-[25%] left-[25%] w-2.5 h-2.5 rounded-full bg-primary/40 pointer-events-none" style={{ animation: "floatA 11s ease-in-out 3s infinite" }} />
      <div className="absolute bottom-[35%] right-[15%] w-1 h-1 rounded-full bg-foreground/50 pointer-events-none" style={{ animation: "floatB 6s ease-in-out 2s infinite" }} />

      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 text-center flex flex-col items-center"
      >
        <p className="text-[10px] md:text-[11px] font-bold tracking-[0.4em] md:tracking-[0.5em] text-muted-foreground mb-12 uppercase">
          One Origin. Infinite possibilities.
        </p>
        
        <div className="relative w-full max-w-[900px] mx-auto mb-16 px-4">
          <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full mix-blend-screen" style={{ animation: "pulseOpacity 4s ease-in-out infinite" }} />
          <h1 className="m-0"><span className="sr-only">ONEORIGIN — Developer workspace and AI agent interface</span><img 
            src={HERO_LOGO} 
            alt="" 
            className="w-full h-auto drop-shadow-[0_0_30px_rgba(var(--primary),0.3)]" 
            style={{ animation: "floatA 8s ease-in-out infinite" }}
          /></h1>
        </div>

        <p className="text-muted-foreground text-sm md:text-lg leading-relaxed max-w-2xl mx-auto font-light">
          The origin of your next extraordinary idea.<br className="hidden sm:block" />
          Build beyond boundaries. Create what comes next.
        </p>
        
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <a href="/hosting?template=origin-starter" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto h-12 px-8 rounded-md bg-foreground text-background hover:bg-foreground/90 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
              Get started <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </a>
          <a href="#templates" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-md border-border bg-background/50 backdrop-blur-sm text-foreground hover:bg-secondary hover:text-foreground hover:scale-105 active:scale-95 transition-all duration-300">
              <Diamond className="w-4 h-4 mr-2 text-muted-foreground" /> Explore templates
            </Button>
          </a>
        </div>

        {/* Multimodal Agent Context Icons */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-20 pt-8 border-t border-border/30 w-full max-w-lg flex flex-col items-center gap-6"
        >
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">Powered by Multimodal AI</p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
            {[Type, ImageIcon, Mic, Video, Terminal, Globe].map((Ic, i) => (
              <div key={i} className="group relative w-10 h-10 rounded-full border border-border/50 bg-card/30 backdrop-blur-md flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all duration-500 hover:-translate-y-1">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Ic className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors relative z-10" />
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

function LogoStrip() {
  return (
    <section className="py-16 md:py-20 border-b border-border/20 bg-background overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:24px_24px] opacity-40" />
      <AnimatedElement className="max-w-7xl mx-auto px-6 relative z-10">
        <p className="text-center text-[9px] sm:text-[10px] tracking-[0.3em] sm:tracking-[0.4em] font-bold text-muted-foreground/70 mb-12 uppercase">
          One foundation. Endless possibilities.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 md:gap-x-20 text-lg md:text-xl font-medium text-muted-foreground/50">
          <span className="hover:text-foreground hover:scale-105 transition-all cursor-default">Layers</span>
          <span className="hover:text-foreground hover:scale-105 transition-all cursor-default flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/></svg>
            Quotient
          </span>
          <span className="hover:text-foreground hover:scale-105 transition-all cursor-default">circooles</span>
          <span className="hover:text-foreground hover:scale-105 transition-all cursor-default flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            Sisyphus
          </span>
          <span className="hover:text-foreground hover:scale-105 transition-all cursor-default">Catalog</span>
        </div>
      </AnimatedElement>
    </section>
  );
}

function FeaturesSection() {
  const [features, setFeatures] = useState([]);
  useEffect(() => { base44.entities.Feature.list().then(setFeatures).catch(() => {}); }, []);
  const staticFallback = [
    { title: "Beautiful by default.", description: "Thoughtfully crafted components. Consistent details. Everything you need to make a lasting first impression.", icon: "Diamond" },
    { title: "Built to move faster.", description: "Go from your first idea to your next big launch with a foundation that gets out of your way.", icon: "ArrowUpRight" },
    { title: "Make it your own.", description: "Flexible, accessible, and endlessly customizable. Your vision, without the limitations.", icon: "LayoutGrid" },
  ];
  const items = features.length > 0 ? features : staticFallback;

  return (
    <section id="features" className="relative py-24 md:py-32 border-b border-border/20 bg-background">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6">
        <AnimatedElement className="max-w-2xl">
          <p className="text-[10px] tracking-[0.3em] font-bold text-muted-foreground mb-6 uppercase">A better way to build</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            Less friction.<br className="hidden sm:block" /> More possibility.
          </h2>
          <p className="text-muted-foreground mt-6 text-base md:text-lg">Start with the essentials. Create something exceptional.</p>
        </AnimatedElement>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
          {items.map((f, i) => {
            const Ic = iconMap[f.icon] || Diamond;
            return (
              <AnimatedElement key={f.id || i} delay={i * 100}>
                <div className="group relative h-full rounded-2xl bg-[#0a0a0a] border border-border/40 p-8 overflow-hidden hover:-translate-y-2 hover:border-primary/30 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl border border-border/50 bg-[#111] flex items-center justify-center text-primary mb-8 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-500">
                      <Ic className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-foreground">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                  </div>
                </div>
              </AnimatedElement>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CapabilitiesSection() {
  const [caps, setCaps] = useState([]);
  useEffect(() => { base44.entities.Capability.list().then(setCaps).catch(() => {}); }, []);
  const staticFallback = [
    { category: "Content & Language", title: "Natural conversation", description: "Talk naturally in 100+ languages including Thai.", icon: "MessagesSquare" },
    { category: "Content & Language", title: "Creative writing", description: "Draft articles, emails, stories and slogans in seconds.", icon: "PenLine" },
    { category: "Technical & Reasoning", title: "Code & debug", description: "Write Python, JavaScript, HTML and find bugs fast.", icon: "Code2" },
    { category: "Collaboration", title: "Pages workspace", description: "AI-native workspace combining chat and documents.", icon: "Users" },
  ];
  const items = caps.length > 0 ? caps : staticFallback;
  const cats = ["Content & Language", "Technical & Reasoning", "Collaboration"];
  const [active, setActive] = useState(cats[0]);
  const shown = items.filter((c) => c.category === active);

  return (
    <section id="agent" className="relative py-24 md:py-32 bg-secondary/20 border-b border-border/20 overflow-hidden">
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[400px] h-[600px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6">
        <AnimatedElement>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-widest uppercase mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Multimodal Agent
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground max-w-2xl leading-tight">
            One intelligent agent.<br />Browser and terminal.
          </h2>
          <p className="text-muted-foreground mt-6 text-base md:text-lg max-w-2xl">
            Understands text, images, audio and video — powered by a large language model that follows deep conversational context to accelerate your workflow.
          </p>
        </AnimatedElement>

        <AnimatedElement delay={200} className="mt-12">
          <div className="flex flex-wrap gap-2 p-1 rounded-2xl bg-card border border-border/50 inline-flex">
            {cats.map((c) => (
              <button 
                key={c} 
                onClick={() => setActive(c)} 
                className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${active === c ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </AnimatedElement>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          {shown.map((c, i) => {
            const Ic = iconMap[c.icon] || Diamond;
            return (
              <AnimatedElement key={c.id || c.title} delay={i * 100}>
                <div className="group h-full rounded-2xl border border-border/40 bg-[#0a0a0a] p-6 hover:-translate-y-2 hover:border-accent/40 transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(var(--accent),0.1)]">
                  <div className="w-10 h-10 rounded-xl bg-secondary border border-border/50 flex items-center justify-center text-accent mb-6 group-hover:scale-110 group-hover:bg-accent/10 transition-all duration-500">
                    <Ic className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">{c.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
                </div>
              </AnimatedElement>
            );
          })}
        </div>

        <AnimatedElement delay={400} className="mt-16 max-w-3xl">
          <div className="rounded-2xl border border-border/40 bg-[#050505] overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 bg-[#111] border-b border-border/40">
              <span className="w-3 h-3 rounded-full bg-destructive/80" />
              <span className="w-3 h-3 rounded-full bg-accent/80" />
              <span className="w-3 h-3 rounded-full bg-primary/80" />
              <span className="ml-4 text-[10px] font-mono text-muted-foreground">terminal — oneorigin</span>
            </div>
            <div className="p-6 font-mono text-sm leading-relaxed">
              <p className="text-muted-foreground flex items-center gap-2">
                <span className="text-accent">~/workspace</span> $ oneorigin chat --mode multimodal
              </p>
              <p className="text-foreground mt-4 flex items-start gap-3">
                <span className="text-primary mt-1">›</span> 
                Summarize user_research.mp4 and cross-reference with market_data.csv to generate a strategy doc.
              </p>
              <div className="mt-4 pl-5 border-l-2 border-border/40">
                <p className="text-muted-foreground animate-pulse">Processing video and analyzing datasets...</p>
                <motion.p 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: 2 }}
                  className="text-foreground mt-2"
                >
                  ✓ Analysis complete. Found 3 key correlations. Generating strategy doc... <span className="inline-block w-2 h-4 bg-primary align-middle" style={{ animation: "blink 1s steps(2) infinite" }} />
                </motion.p>
              </div>
            </div>
          </div>
        </AnimatedElement>
      </div>
    </section>
  );
}

function TemplatesSection() {
  const [templates, setTemplates] = useState([]);
  useEffect(() => { base44.entities.Template.list().then(setTemplates).catch(() => {}); }, []);
  const staticFallback = [
    { title: "Ideas deserve\na great beginning.", label: "Landing page" },
    { title: "Everything.\nIn one place.", label: "Dashboard" },
    { title: "Different by\ndesign.", label: "Portfolio" },
  ];
  const items = templates.length > 0 ? templates : staticFallback;

  return (
    <section id="templates" className="relative py-24 md:py-32 border-b border-border/20 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedElement className="max-w-2xl">
          <p className="text-[10px] tracking-[0.3em] font-bold text-muted-foreground mb-6 uppercase">Your next chapter</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            A head start on something great.
          </h2>
          <p className="text-muted-foreground mt-6 text-base md:text-lg">Choose a starting point. Make it unmistakably yours.</p>
        </AnimatedElement>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          {items.map((t, i) => (
            <AnimatedElement key={t.id || i} delay={i * 120}>
              <a href="#pricing" className="group block rounded-2xl border border-border/40 bg-[#0a0a0a] overflow-hidden hover:-translate-y-2 hover:border-primary/40 hover:shadow-[0_20px_50px_-15px_rgba(var(--primary),0.15)] transition-all duration-500">
                {/* Mockup Area */}
                <div className="bg-[#111] p-6 h-64 border-b border-border/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a]/50" />
                  <div className="relative z-10">
                    <div className="flex justify-between text-[9px] font-bold tracking-widest text-foreground/80 uppercase">
                      <span>Oneorigin</span>
                      <span className="text-muted-foreground/60 flex gap-4 hidden sm:flex">
                        <span>Explore</span><span>About</span><span>Contact</span>
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold mt-12 whitespace-pre-line leading-tight text-foreground">{t.title}</h3>
                    <div className="h-px w-2/3 bg-border mt-8" />
                    <div className="grid grid-cols-3 gap-3 mt-6">
                      <div className="h-10 rounded-md bg-secondary/50 group-hover:bg-primary/20 transition-colors duration-500" />
                      <div className="h-10 rounded-md bg-secondary/50 group-hover:bg-primary/20 transition-colors duration-500 delay-75" />
                      <div className="h-10 rounded-md bg-secondary/50 group-hover:bg-primary/20 transition-colors duration-500 delay-150" />
                    </div>
                  </div>
                </div>
                {/* Footer Area */}
                <div className="flex items-center justify-between px-6 py-5 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors bg-[#0a0a0a]">
                  {t.label}
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                </div>
              </a>
            </AnimatedElement>
          ))}
        </div>
      </div>
    </section>
  );
}

function SignupSection() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const submit = (e) => { e.preventDefault(); if (email) setDone(true); };

  return (
    <section id="pricing" className="relative py-28 md:py-40 bg-background overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[80vw] h-[50vh] bg-[radial-gradient(ellipse_at_center,rgba(var(--primary),0.08)_0%,transparent_70%)] blur-[80px]" />
      </div>
      
      <AnimatedElement className="relative z-10 w-full max-w-2xl mx-auto px-6 text-center">
        <p className="text-[10px] tracking-[0.3em] font-bold text-muted-foreground mb-6 uppercase">Start something</p>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight mb-4">
          Your next great idea starts here.
        </h2>
        <p className="text-muted-foreground text-lg mb-12">Join the list and be the first to know what's next.</p>
        
        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-6 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <p className="font-medium">Thank you — you're on the list.</p>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <Input 
              type="email" 
              required
              aria-label="Your email" 
              placeholder="Enter your email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="bg-[#0a0a0a] border-border/50 h-12 px-5 text-base sm:flex-1 rounded-md focus-visible:ring-primary/50 focus-visible:border-primary/50" 
            />
            <Button type="submit" className="h-12 px-8 rounded-md bg-foreground text-background hover:bg-foreground/90 hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg">
              Get early access <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        )}
        <small className="block mt-6 text-xs text-muted-foreground/60 font-medium tracking-wide">No noise. Just the good stuff.</small>
      </AnimatedElement>
    </section>
  );
}

function QuoteSection() {
  return (
    <section id="testimonials" className="relative py-32 md:py-48 bg-[#030303] border-t border-border/20 overflow-hidden flex items-center justify-center text-center">
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(var(--primary),0.03)_50%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <AnimatedElement className="relative z-10 max-w-4xl mx-auto px-6">
        <p className="text-[10px] tracking-[0.4em] font-bold text-primary/80 mb-10 uppercase">Made for builders</p>
        <blockquote className="text-3xl md:text-5xl lg:text-6xl font-light leading-[1.2] tracking-tight text-foreground">
          "Great ideas need a place to start.<br className="hidden sm:block" />
          This is yours."
        </blockquote>
        <p className="text-sm text-muted-foreground/60 mt-12 font-medium tracking-wide">The ONEORIGIN philosophy</p>
      </AnimatedElement>
    </section>
  );
}

function FaqSection() {
  const [faqs, setFaqs] = useState([]);
  const [open, setOpen] = useState(0);
  useEffect(() => { base44.entities.Faq.list().then(setFaqs).catch(() => {}); }, []);
  const staticFallback = [
    { question: "What is ONEORIGIN?", answer: "A multimodal AI agent workspace for browser and terminal. It seamlessly integrates advanced language models with native file parsing, code execution, and creative tools to accelerate how you build." },
    { question: "Can I customize the templates?", answer: "Absolutely. Every template is designed to be endlessly customizable. You get full access to the source code, design tokens, and component library to make it perfectly match your brand." },
    { question: "How do I get started?", answer: "Join the early access list above. Once invited, you can pick a starting point, connect your repository, and begin building immediately." },
  ];
  const items = faqs.length > 0 ? faqs : staticFallback;

  return (
    <section id="faq" className="py-24 md:py-32 bg-background">
      <AnimatedElement className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12 text-center text-foreground">A few things to know.</h2>
        <div className="divide-y divide-border/30 border-y border-border/30">
          {items.map((f, i) => (
            <div key={f.id || i} className="group">
              <button 
                onClick={() => setOpen(open === i ? -1 : i)} 
                className="w-full flex items-center justify-between py-8 text-lg md:text-xl font-medium text-left text-foreground hover:text-primary transition-colors focus:outline-none"
              >
                {f.question}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${open === i ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-muted-foreground border-border/50 group-hover:border-primary group-hover:text-primary'}`}>
                  {open === i ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
              </button>
              <div 
                className={`grid transition-all duration-500 ease-in-out ${open === i ? "grid-rows-[1fr] opacity-100 pb-8" : "grid-rows-[0fr] opacity-0"}`}
              >
                <div className="overflow-hidden">
                  <p className="text-base text-muted-foreground leading-relaxed pr-12">{f.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AnimatedElement>
    </section>
  );
}

function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatA {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-15px) scale(0.95); }
        }
        @keyframes pulseOpacity {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}} />
      <noscript><style>{'[data-home-reveal] { opacity: 1 !important; transform: none !important; }'}</style></noscript>
      <HeroSection />
      <LogoStrip />
      <FeaturesSection />
      <CapabilitiesSection />
      <TemplatesSection />
      <SignupSection />
      <QuoteSection />
      <FaqSection />
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [{ title: site.title }, { name: "description", content: site.description }],
    links: [
      { rel: "canonical", href: `${site.url}/` },
      { rel: "alternate", type: "text/markdown", href: `${site.url}/index.md` },
      { rel: "describedby", href: `${site.url}/llms.txt` },
    ],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(applicationSchema).replace(/</g, '\\u003c') }],
  }),
});
