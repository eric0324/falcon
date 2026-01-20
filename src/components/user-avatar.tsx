"use client";

import { User } from "lucide-react";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-12 h-12 text-base",
};

const iconSizes = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-6 w-6",
};

function getInitial(name: string | null | undefined): string {
  if (!name) return "";
  return name.trim().charAt(0).toUpperCase();
}

export function UserAvatar({ src, name, size = "md", className = "" }: UserAvatarProps) {
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name || "User"}
        className={`${sizeClass} rounded-full object-cover ${className}`}
      />
    );
  }

  const initial = getInitial(name);

  if (initial) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium ${className}`}
      >
        {initial}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-muted flex items-center justify-center text-muted-foreground ${className}`}
    >
      <User className={iconSize} />
    </div>
  );
}
