import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Sparkles, Loader2, BookOpen, Calculator, FlaskConical, Globe2, Languages } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };
type SubjectMode = "general" | "math" | "science" | "english" | "social" | "esl";

const TUTOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;

const SUBJECT_MODES: { key: SubjectMode; icon: React.ElementType; en: string; ht: string; color: string }[] = [
  { key: "general", icon: Sparkles, en: "All Subjects", ht: "Tout Matyè", color: "bg-primary/10 text-primary" },
  { key: "math", icon: Calculator, en: "Math", ht: "Matematik", color: "bg-accent/10 text-accent" },
  { key: "science", icon: FlaskConical, en: "Science", ht: "Syans", color: "bg-success/10 text-success" },
  { key: "english", icon: BookOpen, en: "English", ht: "Angle", color: "bg-info/10 text-info" },
  { key: "social", icon: Globe2, en: "Social Studies", ht: "Etid Sosyal", color: "bg-warning/10 text-warning" },
  { key: "esl", icon: Languages, en: "ESL", ht: "ESL", color: "bg-secondary/10 text-secondary" },
];

const quickPromptsByMode: Record<SubjectMode, { en: string; ht: string; emoji: string }[]> = {
  general: [
    { en: "Help me study for my test", ht: "Ede m etidye pou egzamen m", emoji: "📚" },
    { en: "Explain this concept simply", ht: "Eksplike konsèp sa a senp", emoji: "💡" },
    { en: "Quiz me on today's lesson", ht: "Poze m kesyon sou leson jodi a", emoji: "✅" },
    { en: "Help me with my homework", ht: "Ede m ak devwa m", emoji: "📝" },
  ],
  math: [
    { en: "Help me with fractions", ht: "Ede m ak fraksyon", emoji: "🔢" },
    { en: "Explain algebra step by step", ht: "Eksplike aljèb pa etap", emoji: "📐" },
    { en: "Word problem practice", ht: "Pratik pwoblèm mo", emoji: "🧮" },
    { en: "Geometry help", ht: "Èd ak jewometri", emoji: "📏" },
  ],
  science: [
    { en: "Explain photosynthesis", ht: "Eksplike fotosintèz", emoji: "🌱" },
    { en: "How does the human body work?", ht: "Kijan kò moun fonksyone?", emoji: "🫀" },
    { en: "Tell me about the solar system", ht: "Pale m sou sistèm solè a", emoji: "🪐" },
    { en: "Chemistry basics", ht: "Baz chimi", emoji: "⚗️" },
  ],
  english: [
    { en: "What is a metaphor?", ht: "Kisa yon metafò ye?", emoji: "📝" },
    { en: "Help me with grammar", ht: "Ede m ak gramè", emoji: "✍️" },
    { en: "Reading comprehension tips", ht: "Konsèy konpreyansyon lekti", emoji: "📖" },
    { en: "Vocabulary building", ht: "Bati vokabilè", emoji: "🔤" },
  ],
  social: [
    { en: "Tell me about world history", ht: "Pale m sou istwa mond", emoji: "🌍" },
    { en: "How does government work?", ht: "Kijan gouvènman fonksyone?", emoji: "🏛️" },
    { en: "Geography basics", ht: "Baz jewografi", emoji: "🗺️" },
    { en: "Current events discussion", ht: "Diskisyon evènman aktyèl", emoji: "📰" },
  ],
  esl: [
    { en: "Help me practice English", ht: "Ede m pratike angle", emoji: "🗣️" },
    { en: "Common English phrases", ht: "Fraz angle ki komen", emoji: "💬" },
    { en: "English pronunciation tips", ht: "Konsèy pwononsyasyon angle", emoji: "🎯" },
    { en: "Translate for me", ht: "Tradwi pou mwen", emoji: "🔄" },
  ],
};

export function TutorChat() {
  const { lang } = useI18n();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [subjectMode, setSubjectMode] = useState<SubjectMode>("general");
  const [rateLimitInfo, setRateLimitInfo] = useState<{ resetAt: string; message: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);
    let assistantSoFar = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Please log in to use Mr A"); setIsLoading(false); return; }

      const resp = await fetch(TUTOR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: allMessages, subjectMode }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        if (resp.status === 429) {
          const resetAt = err.reset_at || "";
          const msg = lang === "HT" ? (err.message_ht || "Ou rive limit èdtan ou pou Mr A.") : (err.message || "Hourly limit reached for Mr A.");
          setRateLimitInfo({ resetAt, message: msg });
        } else if (resp.status === 402) {
          toast.error("AI usage limit reached.");
        } else {
          toast.error(err.error || "Failed to get response");
        }
        setIsLoading(false);
        return;
      }
      // Clear rate limit if request succeeded
      setRateLimitInfo(null);
      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      const processContent = (content: string) => {
        assistantSoFar += content;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      const parseLine = (line: string): boolean => {
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") return false;
        if (!line.startsWith("data: ")) return false;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") return true;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) processContent(content);
        } catch { return false; }
        return false;
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          const line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (parseLine(line)) { streamDone = true; break; }
        }
      }
      if (textBuffer.trim()) textBuffer.split("\n").forEach(parseLine);
    } catch (e) {
      console.error(e);
      toast.error("Failed to connect to Mr A");
    }
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const currentMode = SUBJECT_MODES.find(m => m.key === subjectMode)!;
  const quickPrompts = quickPromptsByMode[subjectMode];

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b mb-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Bot size={22} className="text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg leading-tight">Mr A</h2>
          <p className="text-xs text-muted-foreground">
            {lang === "HT" ? "Pwofesè AI ou" : "Your AI Study Buddy"}
          </p>
        </div>
        <Sparkles size={16} className="text-warning ml-auto" />
      </div>

      {/* Subject Mode Selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-hide">
        {SUBJECT_MODES.map(mode => {
          const Icon = mode.icon;
          const active = subjectMode === mode.key;
          return (
            <button
              key={mode.key}
              onClick={() => setSubjectMode(mode.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                active ? `${mode.color} border-current` : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
              }`}
            >
              <Icon size={12} />
              {lang === "HT" ? mode.ht : mode.en}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
        {messages.length === 0 && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Bot size={32} className="text-primary-foreground" />
            </div>
            <div>
              <p className="font-display font-semibold text-lg">
                {lang === "HT" ? "Bonjou! Mwen se Mr A 👋" : "Hi! I'm Mr A 👋"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {lang === "HT"
                  ? "M ka ede ou ak nenpòt matyè. Chwazi yon matyè oswa poze m yon kesyon!"
                  : "I can help with any subject. Pick a topic or ask me anything!"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
              {quickPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(lang === "HT" ? p.ht : p.en)}
                  className="text-left text-sm rounded-xl bg-muted hover:bg-muted/80 p-3 transition-all border hover:border-primary/30"
                >
                  <span className="text-lg">{p.emoji}</span>
                  <p className="mt-1 font-medium text-xs">{lang === "HT" ? p.ht : p.en}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex-shrink-0 flex items-center justify-center mt-1">
                <Bot size={14} className="text-primary-foreground" />
              </div>
            )}
            <div className={`rounded-2xl px-4 py-3 max-w-[85%] ${
              msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border shadow-sm rounded-bl-md"
            }`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center mt-1">
                <User size={14} className="text-secondary-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex-shrink-0 flex items-center justify-center">
              <Bot size={14} className="text-primary-foreground" />
            </div>
            <div className="rounded-2xl bg-card border shadow-sm px-4 py-3 rounded-bl-md">
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="pt-3 border-t mt-auto">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={lang === "HT" ? "Ekri kesyon ou pou Mr A..." : "Ask Mr A a question..."}
            rows={1}
            className="resize-none min-h-[44px] max-h-24"
            disabled={isLoading}
          />
          <Button size="icon" onClick={() => sendMessage(input)} disabled={!input.trim() || isLoading} className="h-11 w-11 flex-shrink-0">
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
