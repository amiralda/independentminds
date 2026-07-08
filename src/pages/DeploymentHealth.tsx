import { getDeploymentEnvStatus, isDeploymentHealthy } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function DeploymentHealth() {
  const status = getDeploymentEnvStatus();
  const healthy = isDeploymentHealthy();

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Deployment health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`rounded-lg border p-4 ${healthy ? "border-green-500/30 bg-green-500/10" : "border-red-500/30 bg-red-500/10"}`}>
            <div className="flex items-center gap-2 font-semibold">
              {healthy ? <CheckCircle2 className="text-green-600" /> : <XCircle className="text-red-600" />}
              {healthy ? "All required deployment variables look configured." : "One or more deployment variables are missing or invalid."}
            </div>
          </div>

          <ul className="space-y-2">
            {status.map((item) => (
              <li key={item.key} className="flex items-start justify-between gap-4 rounded-md border p-3">
                <div>
                  <div className="font-medium">{item.key}</div>
                  <div className="text-sm text-muted-foreground">{item.message}</div>
                </div>
                {item.ok ? <CheckCircle2 className="text-green-600" /> : <XCircle className="text-red-600" />}
              </li>
            ))}
          </ul>

          <div className="flex gap-3">
            <Button asChild>
              <Link to="/login">Go to login</Link>
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
