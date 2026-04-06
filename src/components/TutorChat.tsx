import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Sparkles, Loader2, BookOpen, Calculator, FlaskConical, Globe2, Languages, Trash2, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type Msg = { role: "user" | "assistant"; content: string | ContentPart[] };
type SubjectMode = "general" | "math" | "science" | "english" | "social" | "esl";

interface AttachedFile {
  name: string;
  type: string;
  dataUrl: string;
  size: number;
}

const TUTOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv', 'text/html', 'text/markdown',
  'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const SUBJECT_MODES: { key: SubjectMode; icon: React.ElementType; labelKey: string; color: string }[] = [
  { key: "general", icon: Sparkles, labelKey: "tutor.allSubjects", color: "bg-primary/10 text-primary" },
  { key: "math", icon: Calculator, labelKey: "tutor.math", color: "bg-accent/10 text-accent" },
  { key: "science", icon: FlaskConical, labelKey: "tutor.science", color: "bg-success/10 text-success" },
  { key: "english", icon: BookOpen, labelKey: "tutor.english", color: "bg-info/10 text-info" },
  { key: "social", icon: Globe2, labelKey: "tutor.social", color: "bg-warning/10 text-warning" },
  { key: "esl", icon: Languages, labelKey: "tutor.esl", color: "bg-secondary/10 text-secondary" },
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

function getDisplayContent(content: string | ContentPart[]): string {
  if (typeof content === 'string') return content;
  return content
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map(p => p.text)
    .join('\n');
}

function isImageType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function isTextBasedType(mimeType: string): boolean {
  return mimeType.startsWith('text/') || mimeType === 'application/json';
}

export function TutorChat() {
  const { lang, t } = useI18n();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const studentId = profile?.studentId || "";
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [subjectMode, setSubjectMode] = useState<SubjectMode>("general");
  const [rateLimitInfo, setRateLimitInfo] = useState<{ resetAt: string; message: string } | null>(null);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: savedHistory } = useQuery({
    queryKey: ["ai_history", studentId, subjectMode],
    queryFn: async () => {
      if (!studentId) return [];
      const { data } = await supabase
        .from("ai_conversations")
        .select("role, content")
        .eq("student_id", studentId)
        .eq("subject", subjectMode)
        .order("created_at", { ascending: true })
        .limit(20);
      return (data || []) as Msg[];
    },
    enabled: !!studentId,
  });

  useEffect(() => {
    if (savedHistory && savedHistory.length > 0) {
      setMessages(savedHistory);
    } else {
      setMessages([]);
    }
  }, [savedHistory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleClearHistory = async () => {
    if (!confirm(t("ai.clearHistoryConfirm"))) return;
    await supabase.rpc("clear_ai_history", { p_student_id: studentId, p_subject: subjectMode });
    setMessages([]);
    queryClient.invalidateQueries({ queryKey: ["ai_history", studentId, subjectMode] });
    toast.success(t("tutor.historyClearedToast"));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error(t('file.tooLarge'));
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      toast.error(t('file.unsupported'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        type: file.type || 'application/octet-stream',
        dataUrl: reader.result as string,
        size: file.size,
      });
    };

    if (isTextBasedType(file.type) || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const buildMessageContent = (text: string, file: AttachedFile | null): string | ContentPart[] => {
    if (!file) return text;

    if (isImageType(file.type)) {
      const parts: ContentPart[] = [
        { type: "text", text: text || t('file.analyzeImage') },
        { type: "image_url", image_url: { url: file.dataUrl } },
      ];
      return parts;
    }

    if (isTextBasedType(file.type) || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const fileContent = file.dataUrl;
      const prefix = text || t('file.analyzeFile');
      return `${prefix}\n\n--- ${file.name} ---\n${fileContent}`;
    }

    // For PDFs and other binary files, send as data URL
    const parts: ContentPart[] = [
      { type: "text", text: text || t('file.analyzeDoc') },
      { type: "image_url", image_url: { url: file.dataUrl } },
    ];
    return parts;
  };

  const sendMessage = async (text: string) => {
    if ((!text.trim() && !attachedFile) || isLoading) return;

    const content = buildMessageContent(text.trim(), attachedFile);
    const userMsg: Msg = { role: "user", content };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setAttachedFile(null);
    setIsLoading(true);
    let assistantSoFar = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Please log in to use Mr A"); setIsLoading(false); return; }

      // Serialize messages for the API - convert ContentPart[] to simple format
      const serializedMessages = allMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const resp = await fetch(TUTOR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: serializedMessages, subjectMode, studentId }),
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
          const c = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (c) processContent(c);
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

  const quickPrompts = quickPromptsByMode[subjectMode];

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b mb-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Bot size={22} className="text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h2 className="font-display font-bold text-lg leading-tight">Mr A</h2>
          <p className="text-xs text-muted-foreground">
            {t("tutor.subtitle")}
          </p>
        </div>
        {messages.length > 0 && (
          <Button size="sm" variant="ghost" onClick={handleClearHistory} className="text-xs" aria-label={t("ai.clearHistory")}>
            <Trash2 size={14} className="mr-1" />
            {t("ai.clearHistory")}
          </Button>
        )}
        <Sparkles size={16} className="text-warning" />
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
              {t(mode.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
        {rateLimitInfo && (
          <div className="rounded-xl bg-warning/10 border border-warning/30 px-4 py-3 text-sm">
            <p className="font-medium text-warning">{rateLimitInfo.message}</p>
            {rateLimitInfo.resetAt && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("ai.rateLimitReset")}: {new Date(rateLimitInfo.resetAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
        {messages.length === 0 && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Bot size={32} className="text-primary-foreground" />
            </div>
            <div>
              <p className="font-display font-semibold text-lg">
                {t("tutor.greeting")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("tutor.intro")}
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

        {messages.map((msg, i) => {
          const displayText = getDisplayContent(msg.content);
          const hasImage = Array.isArray(msg.content) && msg.content.some(p => p.type === 'image_url');
          const hasFile = Array.isArray(msg.content);

          return (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex-shrink-0 flex items-center justify-center mt-1">
                  <Bot size={14} className="text-primary-foreground" />
                </div>
              )}
              <div className={`rounded-2xl px-4 py-3 max-w-[85%] ${
                msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border shadow-sm rounded-bl-md"
              }`}>
                {msg.role === "user" && hasFile && (
                  <div className="flex items-center gap-1 mb-1.5 text-[10px] opacity-80">
                    {hasImage ? <ImageIcon size={10} /> : <FileText size={10} />}
                    <span>{t('file.attached')}</span>
                  </div>
                )}
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown>{displayText}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{displayText}</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center mt-1">
                  <User size={14} className="text-secondary-foreground" />
                </div>
              )}
            </div>
          );
        })}

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

      {/* Attached file preview */}
      {attachedFile && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-dashed mx-1 mb-1">
          {isImageType(attachedFile.type) ? <ImageIcon size={14} className="text-info" /> : <FileText size={14} className="text-primary" />}
          <span className="text-xs font-medium truncate flex-1">{attachedFile.name}</span>
          <span className="text-[10px] text-muted-foreground">{(attachedFile.size / 1024).toFixed(0)}KB</span>
          <button
            onClick={() => setAttachedFile(null)}
            className="p-0.5 rounded hover:bg-muted"
            aria-label={t('file.remove')}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="pt-3 border-t mt-auto">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.csv,.json,.md,.html,.docx,.xlsx"
            onChange={handleFileSelect}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-11 w-11 flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            aria-label={t('file.upload')}
          >
            <Paperclip size={18} />
          </Button>
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={lang === "HT" ? "Ekri kesyon ou pou Mr A..." : "Ask Mr A a question..."}
            rows={1}
            className="resize-none min-h-[44px] max-h-24"
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={(!input.trim() && !attachedFile) || isLoading}
            className="h-11 w-11 flex-shrink-0"
            aria-label="Send"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
