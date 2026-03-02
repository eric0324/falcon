"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

function getGreetingKey(hour: number) {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function getDisplayName(fullName: string) {
  if (!fullName) return "";
  // Chinese name: take first char (surname) off, use the rest
  // If single char or looks like English, use first word
  const trimmed = fullName.trim();
  const isChinese = /[\u4e00-\u9fff]/.test(trimmed);
  if (isChinese) {
    return trimmed.length > 1 ? trimmed.slice(1) : trimmed;
  }
  return trimmed.split(/\s+/)[0];
}

export function HeroGreeting({ userName }: { userName: string }) {
  const t = useTranslations("marketplace.hero");
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    const key = getGreetingKey(hour);
    const displayName = getDisplayName(userName);
    const prefix = t(key);
    setGreeting(displayName ? `${prefix}，${displayName} ` : `${prefix} `);
  }, [userName, t]);

  return (
    <h1 className="text-4xl font-bold mb-2">
      {greeting || "\u00A0"}
      {greeting && <span className="inline-block animate-wave">👋</span>}
    </h1>
  );
}
