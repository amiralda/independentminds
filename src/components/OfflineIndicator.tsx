import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { syncPendingActions } from "@/lib/syncManager";
import { getPendingActions } from "@/lib/offlineQueue";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";

export function OfflineIndicator() {
  const { t } = useI18n();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = async () => {
      setIsOffline(false);
      const { synced } = await syncPendingActions();
      if (synced > 0) {
        toast.success(`${synced} ${t("offline.actionsQueued")} synced ✓`);
      }
      setPendingCount(0);
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    // Check pending on mount
    getPendingActions().then(a => setPendingCount(a.length));

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [t]);

  if (!isOffline && pendingCount === 0) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-50 bg-warning/90 text-warning-foreground px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff size={14} />
      <span>{t("offline.indicator")}</span>
      {pendingCount > 0 && (
        <span className="bg-warning-foreground/20 px-2 py-0.5 rounded-full text-xs">
          {pendingCount} {t("offline.actionsQueued")}
        </span>
      )}
    </div>
  );
}
