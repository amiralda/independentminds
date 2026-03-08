import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogIn } from "lucide-react";
import logo from "@/assets/logo.svg";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src={logo} alt="Independent Minds" className="mx-auto mb-3 w-16 h-16" />
          <h1 className="font-display text-3xl font-bold">Independent Minds</h1>
          <p className="text-muted-foreground text-sm mt-1">Learn Smart. Grow Every Day.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 rounded-xl bg-card p-6 border shadow-sm">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full font-display" disabled={loading}>
            <LogIn size={16} className="mr-2" />
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">Learn Smart. Grow Every Day.</p>
      </div>
    </div>
  );
}
