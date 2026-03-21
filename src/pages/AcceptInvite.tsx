import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import logo from "@/assets/logo.svg";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "needsAuth">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setStatus("error");
      setErrorMsg("No invite token provided.");
      return;
    }
    if (!session) {
      setStatus("needsAuth");
      return;
    }
    acceptInvite();
  }, [token, session, authLoading]);

  const acceptInvite = async () => {
    if (!token || !session?.user) return;
    setStatus("loading");

    try {
      // Look up invite
      const { data: invite, error: lookupError } = await supabase
        .from("guardian_invites")
        .select("*")
        .eq("token", token)
        .eq("status", "pending")
        .single();

      if (lookupError || !invite) {
        setStatus("error");
        setErrorMsg("This invite link is invalid or has expired.");
        return;
      }

      // Check expiry
      if (new Date((invite as any).expires_at) < new Date()) {
        setStatus("error");
        setErrorMsg("This invite link has expired.");
        return;
      }

      // Create co-guardian record
      const { error: insertError } = await supabase.from("co_guardians").insert({
        student_id: (invite as any).student_id,
        guardian_id: session.user.id,
        invited_by: (invite as any).invited_by,
        can_view_progress: true,
      } as any);

      if (insertError) {
        if (insertError.message.includes("duplicate")) {
          setStatus("error");
          setErrorMsg("You are already a co-guardian for this student.");
        } else {
          throw insertError;
        }
        return;
      }

      // Mark invite as accepted
      await supabase
        .from("guardian_invites")
        .update({ status: "accepted", accepted_at: new Date().toISOString() } as any)
        .eq("id", (invite as any).id);

      setStatus("success");
      toast.success("You now have co-guardian access!");
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <img src={logo} alt="Independent Minds" className="w-16 h-16 mx-auto" />
        <h1 className="font-display text-2xl font-bold">Co-Guardian Invite</h1>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-muted-foreground">Processing invite...</p>
          </div>
        )}

        {status === "needsAuth" && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Please sign in or create an account to accept this co-guardian invite.
            </p>
            <Link to={`/login?redirect=/accept-invite?token=${token}`}>
              <Button className="w-full">Sign In / Create Account</Button>
            </Link>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <CheckCircle size={48} className="mx-auto text-primary" />
            <p className="text-lg font-medium">Invite accepted!</p>
            <p className="text-muted-foreground">Redirecting to your dashboard...</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <XCircle size={48} className="mx-auto text-destructive" />
            <p className="text-lg font-medium">Unable to accept invite</p>
            <p className="text-muted-foreground">{errorMsg}</p>
            <Link to="/">
              <Button variant="outline">Go to Dashboard</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
