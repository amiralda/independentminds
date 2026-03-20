import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, ShieldCheck, QrCode, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function MfaSettings() {
  const { t, lang } = useI18n();
  const [enrolling, setEnrolling] = useState(false);
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);

  // Check MFA status on mount
  useState(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      if (data?.totp && data.totp.length > 0) {
        const verified = data.totp.find(f => f.status === "verified");
        if (verified) {
          setMfaEnabled(true);
          setFactorId(verified.id);
        }
      }
    })();
  });

  const handleEnroll = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setQrUri(data.totp.qr_code);
      setFactorId(data.id);
      setEnrolling(true);
    } catch (e: any) {
      toast.error(e.message || "Failed to start MFA enrollment");
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!factorId || verifyCode.length !== 6) return;
    setLoading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      setMfaEnabled(true);
      setEnrolling(false);
      setQrUri(null);
      setVerifyCode("");
      toast.success(lang === "HT" ? "MFA aktive!" : "MFA enabled!");
    } catch (e: any) {
      toast.error(e.message || "Verification failed");
    }
    setLoading(false);
  };

  const handleDisable = async () => {
    if (!factorId) return;
    if (!confirm(lang === "HT" ? "Dezaktive otantifikasyon de faktè?" : "Disable two-factor authentication?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setMfaEnabled(false);
      setFactorId(null);
      toast.success(lang === "HT" ? "MFA dezaktive" : "MFA disabled");
    } catch (e: any) {
      toast.error(e.message || "Failed to disable MFA");
    }
    setLoading(false);
  };

  if (mfaEnabled) {
    return (
      <div className="rounded-xl bg-card border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
            <ShieldCheck size={20} className="text-success" />
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-sm">{t("mfa.protected")}</p>
            <p className="text-xs text-muted-foreground">{t("mfa.enabled")}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleDisable} disabled={loading} className="w-full text-xs">
          {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
          {t("mfa.disable")}
        </Button>
      </div>
    );
  }

  if (enrolling && qrUri) {
    return (
      <div className="rounded-xl bg-card border p-4 space-y-4">
        <div className="flex items-center gap-2">
          <QrCode size={18} className="text-primary" />
          <p className="font-display font-semibold text-sm">{t("mfa.scanQR")}</p>
        </div>
        <div className="flex justify-center">
          <img src={qrUri} alt="MFA QR Code" className="w-48 h-48 rounded-lg border" />
        </div>
        <div>
          <label className="text-sm font-medium">{t("mfa.enterCode")}</label>
          <Input
            value={verifyCode}
            onChange={e => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="mt-1 text-center text-2xl tracking-[0.5em] font-mono"
            maxLength={6}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleVerify} disabled={verifyCode.length !== 6 || loading} className="flex-1">
            {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            {lang === "HT" ? "Verifye" : "Verify"}
          </Button>
          <Button variant="outline" onClick={() => { setEnrolling(false); setQrUri(null); }}>
            {lang === "HT" ? "Anile" : "Cancel"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield size={20} className="text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-display font-semibold text-sm">{t("mfa.enable")}</p>
          <p className="text-xs text-muted-foreground">{t("mfa.description")}</p>
        </div>
      </div>
      <Button size="sm" onClick={handleEnroll} disabled={loading} className="w-full">
        {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Shield size={14} className="mr-1" />}
        {t("mfa.enable")}
      </Button>
    </div>
  );
}
