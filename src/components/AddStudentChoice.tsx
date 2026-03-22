import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { ClipboardList, Send } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onChooseFullForm: () => void;
  onChooseQuickCreate: () => void;
}

export function AddStudentChoice({ open, onClose, onChooseFullForm, onChooseQuickCreate }: Props) {
  const { lang } = useI18n();

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {lang === "HT" ? "Ajoute yon Elèv" : "Add a Student"} 🎓
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {lang === "HT"
            ? "Chwazi kijan ou vle kreye pwofil elèv la:"
            : "Choose how you'd like to create the student profile:"}
        </p>
        <div className="grid gap-3 mt-2">
          {/* Option 1: Full Form */}
          <button
            onClick={onChooseFullForm}
            className="flex items-start gap-4 p-4 rounded-xl border-2 border-muted hover:border-primary hover:bg-primary/5 transition-all text-left group"
          >
            <div className="rounded-lg bg-primary/10 p-3 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <ClipboardList size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-base">
                {lang === "HT" ? "Fòm Konplè" : "Complete Profile Form"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {lang === "HT"
                  ? "Ranpli tout enfòmasyon pèsonèl, foto, epi telechaje dokiman orè."
                  : "Fill in all personal details, upload a photo, and import schedule documents."}
              </p>
            </div>
          </button>

          {/* Option 2: Quick Create */}
          <button
            onClick={onChooseQuickCreate}
            className="flex items-start gap-4 p-4 rounded-xl border-2 border-muted hover:border-secondary hover:bg-secondary/5 transition-all text-left group"
          >
            <div className="rounded-lg bg-secondary/10 p-3 text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
              <Send size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-base">
                {lang === "HT" ? "Kreye Rapid" : "Quick Create & Share"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {lang === "HT"
                  ? "Kreye yon pwofil bazik epi jwenn yon mesaj pou voye pa imèl oswa tèks. Ou ka konplete detay yo aprè."
                  : "Create a basic profile and get a shareable message via email or text. Complete details later."}
              </p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
