export const PLANS = {
  free: { name: "Free", monthlyCredits: 30 },
  pro: { name: "Pro", monthlyCredits: 500 },
  studio: { name: "Studio", monthlyCredits: 2000 }
} as const;

export type Plan = keyof typeof PLANS;

// Credit estimates are product policy, not provider prices. Tune after measuring
// actual provider spend. Never expose provider API keys to the browser.
export function estimateCredits(seconds: number, quality: string) {
  const rate = quality === "premium" ? 5 : quality === "fast" ? 2 : 3;
  return Math.max(5, Math.ceil(seconds * rate));
}
