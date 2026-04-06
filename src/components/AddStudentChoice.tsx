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
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {t("student.add")} 🎓
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t("student.chooseMethod")}
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
                {t("student.completeForm")}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t("student.completeFormDesc")}
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
                {t("student.quickCreate")}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t("student.quickCreateDesc")}
              </p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
