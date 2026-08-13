"use client";

import { Button } from "@/components/ui/button";

export default function StudioError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="glass-panel grid gap-4 p-6 sm:p-8" aria-labelledby="studio-error-heading">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Studio</p>
      <h1 id="studio-error-heading" className="font-heading text-2xl font-semibold">Studio is unavailable</h1>
      <p className="max-w-xl text-sm text-muted-foreground">The Studio workspace could not be loaded. Try again.</p>
      <div><Button type="button" onClick={reset}>Retry Studio</Button></div>
    </section>
  );
}
