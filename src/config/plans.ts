export type PlanKey = "basic" | "plus" | "pro";

export interface PlanConfig {
  key: PlanKey;
  name: string;
  monthlyPrice: string;
  yearlyPriceHint: string;
  summary: string;
  highlights: string[];
}

export const PLANS: PlanConfig[] = [
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

export const PLAN_BY_KEY: Record<PlanKey, PlanConfig> = {
  basic: PLANS[0],
  plus: PLANS[1],
  pro: PLANS[2],
};