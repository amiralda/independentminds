import { useEffect, useState, useRef, useCallback } from "react";
import { useAchievements } from "@/hooks/useAchievements";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Star, Flame, Award, Lock, Medal, Zap, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ALL_BADGES = [
  { name: "20-Lesson Legend", icon: Flame, desc: "Complete 20 lessons in one day" },
  { name: "Weekly Warrior", icon: Trophy, desc: "Complete 120 lessons in one week" },
  { name: "Chapter Champion", icon: Award, desc: "Finish all activities in a chapter" },
  { name: "First Steps", icon: Star, desc: "Complete your first lesson" },
  { name: "Speed Demon", icon: Zap, desc: "Finish 5 blocks before noon" },
  { name: "Perfect Score", icon: Crown, desc: "Score 100% on a lesson" },
  { name: "Consistency King", icon: Medal, desc: "Complete blocks 5 days in a row" },
  { name: "Subject Master", icon: Star, desc: "Complete 50 lessons in one subject" },
];

// Confetti particle component
function ConfettiCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = [
      "hsl(221, 57%, 29%)", // primary blue
      "hsl(43, 89%, 61%)",  // warm yellow
      "hsl(35, 90%, 55%)",  // accent
      "hsl(145, 45%, 45%)", // success green
      "hsl(0, 0%, 100%)",   // white
    ];

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      size: number; color: string; rotation: number; rotSpeed: number;
      life: number; maxLife: number; shape: "rect" | "circle" | "star";
    }

    const particles: Particle[] = [];
    const shapes: Particle["shape"][] = ["rect", "circle", "star"];

    // Burst particles
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 100,
        y: canvas.height / 3,
        vx: (Math.random() - 0.5) * 12,
        vy: Math.random() * -10 - 2,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        life: 0,
        maxLife: 80 + Math.random() * 40,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }

    const drawStar = (cx: number, cy: number, size: number) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const method = i === 0 ? "moveTo" : "lineTo";
        ctx[method](cx + Math.cos(angle) * size, cy + Math.sin(angle) * size);
      }
      ctx.closePath();
      ctx.fill();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;

      for (const p of particles) {
        p.life++;
        if (p.life >= p.maxLife) continue;
        alive++;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.vx *= 0.99;
        p.rotation += p.rotSpeed;

        const alpha = 1 - p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          drawStar(0, 0, p.size / 2);
        }

        ctx.restore();
      }

      if (alive > 0) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-50"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

export function TrophyRoom() {
  const { profile } = useAuth();
  const studentId = profile?.studentId || null;
  const { data: achievements = [], isLoading } = useAchievements(studentId);
  const [showConfetti, setShowConfetti] = useState(false);
  const [newBadges, setNewBadges] = useState<Set<string>>(new Set());
  const seenRef = useRef<Set<string>>(new Set());

  // Detect newly unlocked badges on first view
  useEffect(() => {
    if (achievements.length === 0) return;

    const storedKey = `seen_badges_${studentId}`;
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(storedKey) : null;
    const seenSet = stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    seenRef.current = seenSet;

    const newlyUnlocked = achievements.filter(a => !seenSet.has(a.id));
    if (newlyUnlocked.length > 0) {
      setNewBadges(new Set(newlyUnlocked.map(a => a.name)));
      setShowConfetti(true);

      // Mark as seen
      const allIds = achievements.map(a => a.id);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storedKey, JSON.stringify(allIds));
      }

      // Stop confetti after 3 seconds
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [achievements, studentId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 sm:h-36 rounded-2xl" />
        ))}
      </div>
    );
  }

  const earnedNames = new Set(achievements.map(a => a.name));

  return (
    <div className="space-y-5 sm:space-y-6 relative">
      <ConfettiCanvas active={showConfetti} />

      <div className="text-center">
        <Trophy size={36} className="mx-auto text-secondary mb-2 sm:w-10 sm:h-10" />
        <h2 className="font-display text-xl sm:text-2xl font-bold">Trophy Room</h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          {achievements.length} badge{achievements.length !== 1 ? "s" : ""} earned
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {ALL_BADGES.map((badge) => {
          const unlocked = earnedNames.has(badge.name);
          const isNew = newBadges.has(badge.name);
          const Icon = unlocked ? badge.icon : Lock;
          const earned = achievements.find(a => a.name === badge.name);

          return (
            <div
              key={badge.name}
              className={`rounded-2xl p-4 sm:p-5 text-center transition-all border-2 ${
                unlocked
                  ? "bg-gradient-to-br from-primary to-secondary border-secondary shadow-lg"
                  : "bg-muted/50 border-border opacity-60"
              } ${isNew ? "animate-[badgePop_0.6s_ease-out] ring-2 ring-secondary ring-offset-2 ring-offset-background" : ""}`}
            >
              <Icon
                size={28}
                className={`mx-auto mb-1.5 sm:mb-2 sm:w-9 sm:h-9 ${
                  unlocked ? "text-primary-foreground drop-shadow" : "text-muted-foreground"
                } ${isNew ? "animate-[sparkle_1s_ease-in-out_infinite]" : ""}`}
              />
              <h3
                className={`font-display font-semibold text-xs sm:text-sm leading-tight ${
                  unlocked ? "text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {badge.name}
              </h3>
              <p
                className={`text-[9px] sm:text-[10px] mt-1 leading-tight ${
                  unlocked ? "text-primary-foreground/70" : "text-muted-foreground/70"
                }`}
              >
                {unlocked && earned
                  ? new Date(earned.criteria_met_at).toLocaleDateString()
                  : badge.desc}
              </p>
              {isNew && (
                <span className="inline-block mt-1.5 text-[9px] font-bold bg-primary-foreground text-primary px-2 py-0.5 rounded-full animate-pulse">
                  ✨ NEW!
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Recent achievements list */}
      {achievements.length > 0 && (
        <div className="rounded-xl bg-card border p-3 sm:p-4 shadow-sm">
          <h3 className="font-display font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Recent Achievements</h3>
          <div className="space-y-2">
            {achievements.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <Trophy size={12} className="text-secondary sm:w-3.5 sm:h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{a.name}</p>
                  {a.description && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{a.description}</p>
                  )}
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">
                  {new Date(a.criteria_met_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
