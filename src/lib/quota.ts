import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { estimateCost } from "@/lib/ai/models";

async function getDefaultMonthlyQuotaUsd(): Promise<number> {
  const val = await getConfig("DEFAULT_MONTHLY_QUOTA_USD");
  return parseFloat(val || "50");
}

export interface QuotaStatus {
  status: "ok" | "warning" | "blocked";
  monthlyLimitUsd: number;
  bonusBalanceUsd: number;
  effectiveLimitUsd: number;
  currentUsageUsd: number;
  remainingUsd: number;
}

export async function getOrCreateQuota(userId: string) {
  const existing = await prisma.userQuota.findUnique({ where: { userId } });
  if (existing) return existing;

  const defaultQuota = await getDefaultMonthlyQuotaUsd();
  return prisma.userQuota.create({
    data: {
      userId,
      monthlyLimitUsd: defaultQuota,
      bonusBalanceUsd: 0,
      periodStart: getMonthStart(new Date()),
    },
  });
}

export async function getMonthlyUsage(
  userId: string,
  since: Date
): Promise<number> {
  const result = await prisma.tokenUsage.aggregate({
    where: { userId, createdAt: { gte: since } },
    _sum: { costUsd: true },
  });
  return result._sum.costUsd ?? 0;
}

/** If we've crossed into a new month, deduct overages from bonus and reset periodStart. */
export async function processMonthReset(
  quota: { id: string; userId: string; monthlyLimitUsd: number; bonusBalanceUsd: number; periodStart: Date }
) {
  const now = new Date();
  const currentMonthStart = getMonthStart(now);

  if (quota.periodStart >= currentMonthStart) return quota;

  // Calculate last period's usage
  const lastUsage = await getMonthlyUsage(quota.userId, quota.periodStart);
  const overage = Math.max(0, lastUsage - quota.monthlyLimitUsd);
  const newBonus = Math.max(0, quota.bonusBalanceUsd - overage);

  return prisma.userQuota.update({
    where: { id: quota.id },
    data: {
      bonusBalanceUsd: newBonus,
      periodStart: currentMonthStart,
    },
  });
}

export async function checkQuota(userId: string): Promise<QuotaStatus> {
  let quota = await getOrCreateQuota(userId);
  quota = await processMonthReset(quota);

  const currentUsageUsd = await getMonthlyUsage(userId, quota.periodStart);
  const effectiveLimitUsd = quota.monthlyLimitUsd + quota.bonusBalanceUsd;
  const remainingUsd = Math.max(0, effectiveLimitUsd - currentUsageUsd);

  let status: QuotaStatus["status"] = "ok";
  if (currentUsageUsd >= effectiveLimitUsd) {
    status = "blocked";
  } else if (currentUsageUsd >= effectiveLimitUsd * 0.8) {
    status = "warning";
  }

  return {
    status,
    monthlyLimitUsd: quota.monthlyLimitUsd,
    bonusBalanceUsd: quota.bonusBalanceUsd,
    effectiveLimitUsd,
    currentUsageUsd: Math.round(currentUsageUsd * 100) / 100,
    remainingUsd: Math.round(remainingUsd * 100) / 100,
  };
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export { estimateCost };
