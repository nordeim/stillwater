'use client';

interface SubscriptionData {
  creditsRemaining: number | null;
  plan: {
    name: string;
    interval: string;
    classCreditsPerCycle: number | null;
  } | null;
}

export function CreditUsageWidget({ subscription }: { subscription: SubscriptionData }) {
  const creditsRemaining = subscription.creditsRemaining;
  const creditsPerCycle = subscription.plan?.classCreditsPerCycle ?? null;

  const isUnlimited = creditsPerCycle === null;
  const displayRemaining = isUnlimited ? '∞' : String(creditsRemaining ?? 0);
  const displayTotal = isUnlimited ? 'Unlimited' : String(creditsPerCycle);

  return (
    <div
      className="border border-stone-200 bg-sand-50 p-6"
      role="img"
      aria-label={isUnlimited ? 'Unlimited credits' : `${String(creditsRemaining ?? 0)} of ${String(creditsPerCycle)} credits remaining`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
        Class Credits
      </p>
      <div className="mt-4 flex items-end gap-4">
        <p className="text-4xl font-light text-stone-900">
          {displayRemaining}
        </p>
        <p className="pb-1 text-sm text-stone-500">
          / {displayTotal} {isUnlimited ? '' : 'remaining'}
        </p>
      </div>
      {!isUnlimited && creditsPerCycle && (
        <div className="mt-4 h-2 w-full bg-stone-200">
          <div
            className="h-full bg-clay-400"
            style={{
              width: `${Math.min(100, ((creditsRemaining ?? 0) / creditsPerCycle) * 100)}%`,
            }}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
