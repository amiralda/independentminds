// Plans sold through Stripe checkout (Pricing page).
export type PlanKey = "basic" | "plus" | "pro";
// Every plan_key a subscription can hold. super_pro is admin-assigned only
// (never sold via Stripe) and includes everything in Pro.
export type AssignablePlanKey = PlanKey | "super_pro";

export const ASSIGNABLE_PLAN_KEYS: AssignablePlanKey[] = ["basic", "plus", "pro", "super_pro"];

export interface PlanConfig {
  key: AssignablePlanKey;
  name: string;
  monthlyPrice: string;
  yearlyPriceHint: string;
  summary: string;
  highlights: string[];
}

export const PLANS: (PlanConfig & { key: PlanKey })[] = [
  {
    key: "basic",
    name: "Basic",
    monthlyPrice: "$5/mo",
    yearlyPriceHint: "$50/year equivalent",
    summary: "Great for one learner getting started.",
    highlights: ["AI Tutor access", "Weekly progress reports", "Standard support"],
  },
  {
    key: "plus",
    name: "Plus",
    monthlyPrice: "$9.99/mo",
    yearlyPriceHint: "$99.90/year equivalent",
    summary: "Best fit for growing homeschool routines.",
    highlights: ["Everything in Basic", "Priority processing", "Parent insights"],
  },
  {
    key: "pro",
    name: "Pro",
    monthlyPrice: "$25/mo",
    yearlyPriceHint: "$250/year equivalent",
    summary: "For families and educators managing multiple students.",
    highlights: ["Everything in Plus", "Advanced analytics", "Premium support"],
  },
];

export const SUPER_PRO_PLAN: PlanConfig = {
  key: "super_pro",
  name: "Super Pro",
  monthlyPrice: "Custom",
  yearlyPriceHint: "Assigned by an administrator",
  summary: "Everything in Pro, plus more.",
  highlights: ["Everything in Pro", "Early access to new features", "Direct support"],
};

export const PLAN_BY_KEY: Record<AssignablePlanKey, PlanConfig> = {
  basic: PLANS[0],
  plus: PLANS[1],
  pro: PLANS[2],
  super_pro: SUPER_PRO_PLAN,
};

// Tier order for "at least plan X" checks. Unknown/null plan_key ranks as
// basic so a new name never accidentally unlocks more than intended, and
// super_pro always ranks above pro.
const PLAN_RANK: Record<AssignablePlanKey, number> = { basic: 0, plus: 1, pro: 2, super_pro: 3 };

export function planIncludes(planKey: string | null | undefined, required: AssignablePlanKey): boolean {
  const rank = PLAN_RANK[(planKey ?? "basic") as AssignablePlanKey] ?? 0;
  return rank >= PLAN_RANK[required];
}