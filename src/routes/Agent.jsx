import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Send, Terminal, Globe, Image as ImageIcon, Mic, Video, Type, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

const AnimatedElement = ({ children, className, delay = 0 }) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) { setIsVisible(true); return; }
    const fallback = setTimeout(() => setIsVisible(true), 800 + delay);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { clearTimeout(fallback); setTimeout(() => setIsVisible(true), delay); observer.unobserve(el); }
    }, { threshold: 0.05, rootMargin: "0px 0px 200px 0px" });
    observer.observe(el);
    return () => { observer.disconnect(); clearTimeout(fallback); };
  }, [delay]);
  return (
    <div ref={ref} className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className || ""}`}>
      {children}
    </div>
  );
};

const modes = [
  { key: "text", label: "Text", icon: Type },
  { key: "image", label: "Image", icon: ImageIcon },
  { key: "audio", label: "Audio", icon: Mic },
  { key: "video", label: "Video", icon: Video },
];

function HeroSection() {
  return (
    <section className="relative border-b border-border">
      <div className="absolute -top-20 left-1/4 w-[500px] h-[300px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-16 right-[12%] w-3 h-3 rounded-full bg-accent pointer-events-none" style={{ animation: "floatA 8s ease-in-out infinite" }} />
      <div className="absolute bottom-16 left-[10%] w-2 h-2 rounded-full bg-primary/50 pointer-events-none" style={{ animation: "floatB 6s ease-in-out 2s infinite" }} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }} className="relative max-w-6xl mx-auto px-6 py-20 min-h-[40vh] text-center">
        <p className="text-[10px] tracking-[0.4em] font-bold text-accent mb-5">MULTIMODAL AGENT</p>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-foreground via-accent to-foreground bg-clip-text text-transparent animate-gradient-x">Talk to your agent anywhere.</span>
        </h1>
        <p className="text-muted-foreground mt-5 max-w-2xl mx-auto">Text, images, audio and video in one conversation. Use it in the browser, or drop into your terminal.</p>
      </motion.div>
    </section>
  );
}

function ChatDemo() {
  const [surface, setSurface] = useState("browser");
  const [mode, setMode] = useState("text");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "agent", text: "Hello! I understand text, images, audio and video. Ask me anything, in any language." },
  ]);
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, typing]);

  const send = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const q = input.trim();
    setMessages((m) => [...m, { role: "user", text: q, mode }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { role: "agent", text: `Got it. Processing your ${mode} request: "${q}". I remember our earlier context, so you can ask me to refine this at any time.` }]);
    }, 1100);
  };

  return (
    <section className="py-20">
      <AnimatedElement className="max-w-5xl mx-auto px-6">
        <div className="flex gap-2 mb-5">
          <button onClick={() => setSurface("browser")} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm border transition-all ${surface === "browser" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}><Globe className="w-4 h-4" /> Browser</button>
          <button onClick={() => setSurface("terminal")} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm border transition-all ${surface === "terminal" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}><Terminal className="w-4 h-4" /> Terminal</button>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-primary/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary">
            <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" /><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" /><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />
            <span className="ml-3 text-xs text-muted-foreground">{surface === "browser" ? "app.oneorigin.ai / chat" : "~/projects — oneorigin"}</span>
          </div>
          <div className={`h-80 overflow-y-auto p-5 space-y-4 ${surface === "terminal" ? "font-mono text-sm" : "text-sm"}`}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" && surface === "browser" ? "justify-end" : "justify-start"}`}>
                {surface === "terminal" ? (
                  <p className={m.role === "user" ? "text-foreground" : "text-accent"}>{m.role === "user" ? "› " : "✓ "}{m.text}</p>
                ) : (
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 leading-6 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{m.text}</div>
                )}
              </div>
            ))}
            {typing && <p className="text-muted-foreground text-sm" style={{ animation: "blink 1s steps(2) infinite" }}>Agent is thinking…</p>}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="border-t border-border p-4 space-y-3">
            <div className="flex gap-2">
              {modes.map((md) => (
                <button type="button" key={md.key} onClick={() => setMode(md.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-all ${mode === md.key ? "bg-secondary text-foreground border-accent" : "border-border text-muted-foreground hover:text-foreground"}`}><md.icon className="w-3.5 h-3.5" />{md.label}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={surface === "terminal" ? "oneorigin ask ..." : "Message ONEORIGIN..."} className="bg-background border-border h-11" />
              <Button type="submit" className="h-11 bg-primary text-primary-foreground hover:bg-primary/90"><Send className="w-4 h-4" /></Button>
            </div>
          </form>
        </div>
      </AnimatedElement>
    </section>
  );
}

function Capabilities() {
  const [caps, setCaps] = useState([]);
  useEffect(() => { base44.entities.Capability.list().then(setCaps).catch(() => {}); }, []);
  const staticFallback = [
    { category: "Content & Language", title: "Natural conversation", description: "Talk naturally in 100+ languages including Thai." },
    { category: "Content & Language", title: "Creative writing", description: "Draft articles, emails and slogans." },
    { category: "Technical & Reasoning", title: "Code & debug", description: "Write and debug Python, JavaScript, HTML." },
    { category: "Collaboration", title: "Pages workspace", description: "Chat and documents in one AI-native workspace." },
  ];
  const items = caps.length > 0 ? caps : staticFallback;
  const cats = [...new Set(items.map((c) => c.category))];
  return (
    <section className="py-20 bg-secondary/40 border-y border-border">
      <div className="max-w-6xl mx-auto px-6 space-y-14">
        {cats.map((cat, ci) => (
          <AnimatedElement key={cat} delay={ci * 80}>
            <h2 className="text-2xl font-bold tracking-tight mb-6">{cat}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {items.filter((c) => c.category === cat).map((c, i) => (
                <div key={c.id || c.title} className="p-px rounded-xl bg-gradient-to-br from-border via-transparent to-accent/40 hover:-translate-y-1 hover:shadow-[0_20px_60px_-15px_hsl(var(--accent)/0.4)] transition-all duration-500">
                  <div className="h-full rounded-xl bg-card p-6">
                    <Sparkles className="w-4 h-4 text-accent mb-4" />
                    <h3 className="font-semibold text-sm mb-2">{c.title}</h3>
                    <p className="text-sm text-muted-foreground leading-6">{c.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedElement>
        ))}
      </div>
    </section>
  );
}

function Personality() {
  const [concise, setConcise] = useState([60]);
  const [warm, setWarm] = useState([40]);
  const [emoji, setEmoji] = useState(false);
  const [memory, setMemory] = useState(true);
  return (
    <section className="relative py-20 overflow-hidden">
      <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[500px] h-[300px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <AnimatedElement className="relative max-w-3xl mx-auto px-6">
        <p className="text-[10px] tracking-[0.3em] font-bold text-accent mb-4">CHARACTERISTICS</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">Tune the personality.</h2>
        <div className="rounded-2xl border border-border bg-card p-8 space-y-8">
          <div>
            <div className="flex justify-between text-sm mb-3"><span>Conciseness</span><span className="text-muted-foreground">{concise[0]}%</span></div>
            <Slider value={concise} onValueChange={setConcise} max={100} step={5} />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-3"><span>Warmth</span><span className="text-muted-foreground">{warm[0]}%</span></div>
            <Slider value={warm} onValueChange={setWarm} max={100} step={5} />
          </div>
          <div className="flex items-center justify-between text-sm"><span>Use emoji</span><Switch checked={emoji} onCheckedChange={setEmoji} /></div>
          <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2">Remember conversation context {memory && <Check className="w-3.5 h-3.5 text-accent" />}</span><Switch checked={memory} onCheckedChange={setMemory} /></div>
        </div>
      </AnimatedElement>
    </section>
  );
}

function Agent() {
  return (
    <div>
      <HeroSection />
      <ChatDemo />
      <Capabilities />
      <Personality />
    </div>
  );
}

export const Route = createFileRoute("/Agent")({ component: Agent, ssr: false });
