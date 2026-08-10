"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  LockKey,
  SpinnerGap,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginCredentials } from "@/lib/auth/login-schema";
import { login } from "./actions";

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

const authenticationServiceError =
  "VEO OS could not reach the authentication service. Try again.";

type Authenticate = typeof login;

export interface LoginFormProps {
  authenticate?: Authenticate;
}

export function LoginForm({ authenticate = login }: LoginFormProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [showPassword, setShowPassword] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isTransitionPending, startTransition] = useTransition();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const isPending = isSubmitting || isTransitionPending;

  async function onSubmit(credentials: LoginCredentials) {
    setServerMessage(null);

    try {
      const result = await authenticate(credentials);

      if (result.success) {
        startTransition(() => {
          router.replace("/");
          router.refresh();
        });
        return;
      }

      setServerMessage(result.message);
    } catch {
      setServerMessage(authenticationServiceError);
    }
  }

  return (
    <form
      aria-busy={isPending}
      aria-label="VEO OS sign in"
      className="space-y-5"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="space-y-2">
        <label
          className="block text-xs font-semibold tracking-[0.05em] text-foreground"
          htmlFor="login-email"
        >
          Email
        </label>
        <div className="relative">
          <EnvelopeSimple
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
            weight="regular"
          />
          <Input
            {...register("email")}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            aria-invalid={Boolean(errors.email)}
            autoComplete="username"
            className="h-11 pl-10"
            disabled={isPending}
            id="login-email"
            inputMode="email"
            type="email"
          />
        </div>
        {errors.email ? (
          <p
            className="text-sm text-destructive"
            id="login-email-error"
          >
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          className="block text-xs font-semibold tracking-[0.05em] text-foreground"
          htmlFor="login-password"
        >
          Password
        </label>
        <div className="relative">
          <LockKey
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
            weight="regular"
          />
          <Input
            {...register("password")}
            aria-describedby={
              errors.password ? "login-password-error" : undefined
            }
            aria-invalid={Boolean(errors.password)}
            autoComplete="current-password"
            className="h-11 px-10"
            disabled={isPending}
            id="login-password"
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none"
            disabled={isPending}
            onClick={() => setShowPassword((visible) => !visible)}
            type="button"
          >
            {showPassword ? (
              <EyeSlash aria-hidden="true" size={18} weight="regular" />
            ) : (
              <Eye aria-hidden="true" size={18} weight="regular" />
            )}
          </button>
        </div>
        {errors.password ? (
          <p
            className="text-sm text-destructive"
            id="login-password-error"
          >
            {errors.password.message}
          </p>
        ) : null}
      </div>

      {serverMessage ? (
        <p
          className="rounded-[10px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {serverMessage}
        </p>
      ) : null}

      <Button asChild className="h-11 w-full">
        <motion.button
          disabled={isPending}
          transition={springTransition}
          type="submit"
          whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
        >
          {isPending ? (
            <>
              <motion.span
                animate={shouldReduceMotion ? undefined : { rotate: 360 }}
                aria-hidden="true"
                className="inline-flex"
                transition={{ ...springTransition, repeat: Infinity }}
              >
                <SpinnerGap size={18} weight="bold" />
              </motion.span>
              Authenticating…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight aria-hidden="true" size={18} weight="bold" />
            </>
          )}
        </motion.button>
      </Button>
    </form>
  );
}
