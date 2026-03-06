import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useSubmitCheckIn } from "@/hooks/useSubmitCheckIn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Heart, Zap, HelpCircle, Send } from "lucide-react";

interface Props {
  studentId: string | null;
  onDone?: () => void;
}

export function CheckInForm({ studentId, onDone }: Props) {
  const { t } = useI18n();
  const [mood, setMood] = useState<string>("");
  const [focus, setFocus] = useState<string>("");
  const [needHelp, setNeedHelp] = useState(false);
  const [comment, setComment] = useState("");
  const [blocksDone, setBlocksDone] = useState(0);

  const mutation = useSubmitCheckIn(() => {
    toast.success(t("checkin.success"));
    setMood("");
    setFocus("");
    setNeedHelp(false);
    setComment("");
    setBlocksDone(0);
    onDone?.();
  });

  const handleSubmit = () => {
    if (!mood || !focus) {
      toast.error("Please select mood and focus");
      return;
    }
    if (!studentId) {
      toast.error("No student profile found");
      return;
    }
    mutation.mutate({
      student_id: studentId,
      mood,
      focus,
      blocks_done: blocksDone,
      need_help: needHelp,
      comment: comment || null,
    });
  };

  const moodOptions = [
    { value: "Good", label: t("mood.good") },
    { value: "Okay", label: t("mood.okay") },
    { value: "Tired", label: t("mood.tired") },
  ];

  const focusOptions = [
    { value: "High", label: t("focus.high") },
    { value: "Medium", label: t("focus.medium") },
    { value: "Low", label: t("focus.low") },
  ];

  return (
    <div className="space-y-6 rounded-xl bg-card p-6 shadow-sm border">
      {/* Mood */}
      <div>
        <label className="flex items-center gap-2 font-display font-semibold text-lg mb-3">
          <Heart size={20} className="text-destructive" /> {t("checkin.mood")}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {moodOptions.map(o => (
            <button
              key={o.value}
              onClick={() => setMood(o.value)}
              className={`rounded-xl p-3 text-center text-sm font-medium transition-all border-2 ${
                mood === o.value
                  ? "border-primary bg-primary/10 shadow-sm scale-105"
                  : "border-transparent bg-muted hover:bg-muted/80"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Focus */}
      <div>
        <label className="flex items-center gap-2 font-display font-semibold text-lg mb-3">
          <Zap size={20} className="text-warning" /> {t("checkin.focus")}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {focusOptions.map(o => (
            <button
              key={o.value}
              onClick={() => setFocus(o.value)}
              className={`rounded-xl p-3 text-center text-sm font-medium transition-all border-2 ${
                focus === o.value
                  ? "border-primary bg-primary/10 shadow-sm scale-105"
                  : "border-transparent bg-muted hover:bg-muted/80"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Blocks done */}
      <div>
        <label className="font-display font-semibold text-lg mb-2 block">{t("blocks.done")}</label>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setBlocksDone(n)}
              className={`w-10 h-10 rounded-lg font-display transition-all ${
                blocksDone === n
                  ? "bg-secondary text-secondary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Need help */}
      <div>
        <label className="flex items-center gap-2 font-display font-semibold text-lg mb-3">
          <HelpCircle size={20} className="text-info" /> {t("checkin.needHelp")}
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => setNeedHelp(true)}
            className={`flex-1 rounded-xl p-3 text-center font-medium transition-all border-2 ${
              needHelp ? "border-destructive bg-destructive/10" : "border-transparent bg-muted"
            }`}
          >
            {t("yes")}
          </button>
          <button
            onClick={() => setNeedHelp(false)}
            className={`flex-1 rounded-xl p-3 text-center font-medium transition-all border-2 ${
              !needHelp ? "border-secondary bg-secondary/10" : "border-transparent bg-muted"
            }`}
          >
            {t("no")}
          </button>
        </div>
      </div>

      {/* Comment */}
      <div>
        <label className="font-display font-semibold text-lg mb-2 block">{t("checkin.comment")}</label>
        <Textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          placeholder="Tell us more..."
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={mutation.isPending}
        className="w-full font-display text-lg h-12"
        size="lg"
      >
        <Send size={18} className="mr-2" /> {t("checkin.submit")}
      </Button>
    </div>
  );
}
