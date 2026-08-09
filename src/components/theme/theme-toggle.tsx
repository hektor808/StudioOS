"use client";

import { MoonStars, Sun } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="glass"
        size="icon"
        className="rounded-full"
        aria-label="Toggle theme"
        disabled
      />
    );
  }

  const isDark = resolvedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";
  const label = `Switch to ${nextTheme} theme`;
  const Icon = isDark ? Sun : MoonStars;

  return (
    <Button asChild variant="glass" size="icon" className="rounded-full">
      <motion.button
        type="button"
        aria-label={label}
        onClick={() => setTheme(nextTheme)}
        transition={shouldReduceMotion ? { duration: 0 } : springTransition}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
      >
        <Icon aria-hidden="true" size={18} weight="duotone" />
      </motion.button>
    </Button>
  );
}
