import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { GraduationCap, Users, Target, Bell } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onAddStudent: () => void;
}

export function WelcomeModal({ open, onClose, onAddStudent }: Props) {
  const { t } = useI18n();
  const { updateProfile } = useAuth();
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: GraduationCap,
      title: t("welcome.title"),
      description: t("welcome.subtitle"),
    },
    {
      icon: Users,
      title: t("action.addStudent"),
      description: t("welcome.addFirst"),
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  const handleGetStarted = async () => {
    if (step === 0) {
      setStep(1);
    } else {
      await updateProfile({ onboarding_complete: true });
      onClose();
      onAddStudent();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <div className="flex justify-end mb-2">
            <LanguageToggle />
          </div>
          <div className="flex justify-center py-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon size={40} className="text-primary" />
            </div>
          </div>
          <DialogTitle className="font-display text-2xl text-center">{current.title}</DialogTitle>
          <p className="text-center text-muted-foreground mt-2">{current.description}</p>
        </DialogHeader>

        {step === 0 && (
          <div className="space-y-3 py-4">
            <Feature icon={Users} text={t("action.addStudent")} />
            <Feature icon={Target} text={t("tracks.title")} />
            <Feature icon={Bell} text={t("telegram.title")} />
          </div>
        )}

        <Button onClick={handleGetStarted} className="w-full font-display bg-secondary text-secondary-foreground hover:bg-secondary/90 text-lg h-12">
          {step === 0 ? t("welcome.getStarted") : t("action.addStudent")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function Feature({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
      <Icon size={20} className="text-primary flex-shrink-0" />
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}
