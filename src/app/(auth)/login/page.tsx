import { ShieldCheck, Waveform } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

const signalBars = [
  "h-5",
  "h-9",
  "h-14",
  "h-8",
  "h-20",
  "h-11",
  "h-24",
  "h-16",
  "h-7",
  "h-12",
  "h-6",
];

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-dvh p-4 md:p-8">
      <div className="glass-panel relative mx-auto grid min-h-[calc(100dvh-2rem)] w-full max-w-6xl overflow-hidden md:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1.08fr_0.92fr]">
        <div className="absolute right-4 top-4 z-20 md:right-6 md:top-6">
          <ThemeToggle />
        </div>

        <section className="relative flex min-h-[22rem] flex-col overflow-hidden border-b border-border p-6 pt-20 md:p-10 md:pt-24 lg:min-h-0 lg:border-b-0 lg:border-r lg:p-12">
          <div
            aria-hidden="true"
            className="absolute -left-24 top-1/3 h-64 w-64 rounded-full bg-primary/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-0 right-0 h-px w-2/3 bg-gradient-to-l from-primary/50 to-transparent"
          />

          <div className="relative z-10">
            <div className="mb-8 flex items-center gap-3 text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-px w-8 bg-primary/70" />
              VEO // PRIVATE NETWORK
            </div>
            <p className="font-heading text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Production operating system
            </p>
            <h1 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.03em] text-foreground md:text-5xl">
              VEO OS
            </h1>
          </div>

          <div
            aria-hidden="true"
            className="relative z-10 my-auto hidden py-12 md:block md:py-16"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border bg-background/20 px-5 py-6 shadow-inner md:px-7 md:py-8">
              <div className="mb-7 flex items-center justify-between text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <span>Identity signal</span>
                <span>VEO-01</span>
              </div>

              <div className="relative flex h-28 items-center justify-center gap-2 md:gap-3">
                <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
                <div className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-primary/60 bg-background" />
                <div className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-primary/60 bg-background" />
                {signalBars.map((height, index) => (
                  <span
                    className={`relative w-1.5 rounded-full bg-primary/70 shadow-[0_0_20px_hsl(var(--primary)/0.18)] md:w-2 ${height}`}
                    key={`${height}-${index}`}
                  />
                ))}
              </div>

              <div className="mt-7 flex items-center gap-3 border-t border-border pt-5">
                <Waveform
                  className="text-primary"
                  size={20}
                  weight="duotone"
                />
                <span className="text-xs font-medium tracking-[0.08em] text-foreground">
                  CONTROLLED STUDIO ENTRY
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-start gap-3 border-t border-border pt-5">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-primary"
              size={20}
              weight="duotone"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
                Access protocol
              </p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Invite verification is performed when credentials are submitted.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center p-6 md:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Authorized personnel
            </p>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.02em] text-foreground md:text-4xl">
              Private studio access
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground md:text-base">
              Access is limited to invited VEO team members. Sign in with your
              assigned studio credentials.
            </p>

            <div className="mt-8 rounded-2xl border border-border bg-background/20 p-5 shadow-inner md:p-6">
              <LoginForm />
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
              Authentication status is confirmed after sign-in.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
