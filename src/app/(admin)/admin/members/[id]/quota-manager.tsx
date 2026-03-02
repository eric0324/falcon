"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface QuotaStatus {
  status: "ok" | "warning" | "blocked";
  monthlyLimitUsd: number;
  bonusBalanceUsd: number;
  effectiveLimitUsd: number;
  currentUsageUsd: number;
  remainingUsd: number;
}

export function QuotaManager({ userId }: { userId: string }) {
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/members/${userId}/quota`)
      .then((r) => r.json())
      .then(setQuota)
      .catch(() => {});
  }, [userId]);

  const handleTopUp = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${userId}/quota`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: num }),
      });
      if (res.ok) {
        const updated = await res.json();
        setQuota(updated);
        setAmount("");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!quota) return null;

  const statusColor =
    quota.status === "blocked"
      ? "text-red-600"
      : quota.status === "warning"
        ? "text-yellow-600"
        : "text-green-600";

  return (
    <div className="mb-6 rounded-lg border p-4">
      <h3 className="text-sm font-semibold mb-3">額度管理</h3>
      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <span className="text-muted-foreground">月額度上限</span>
          <p className="font-medium">${quota.monthlyLimitUsd.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Bonus 餘額</span>
          <p className="font-medium">${quota.bonusBalanceUsd.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">本月已用</span>
          <p className="font-medium">${quota.currentUsageUsd.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">剩餘額度</span>
          <p className={`font-medium ${statusColor}`}>
            ${quota.remainingUsd.toFixed(2)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          step="1"
          placeholder="補充金額 (USD)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-40"
        />
        <Button size="sm" onClick={handleTopUp} disabled={loading || !amount}>
          {loading ? "處理中..." : "補充額度"}
        </Button>
      </div>
    </div>
  );
}
