"use client";

import { useState } from "react";
import { Loader2, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginForm({
  restaurantName,
  logoUrl,
}: {
  restaurantName: string;
  logoUrl?: string;
}) {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError === "MissingCSRF"
      ? "Error de seguridad (CSRF). Por favor intenta de nuevo."
      : urlError === "OAuthAccountNotLinked"
        ? "Este email ya tiene una cuenta con contraseña. Inicia sesión con email y contraseña."
        : urlError === "AccessDenied"
          ? "Tu cuenta de Google no está registrada en el sistema."
          : urlError === "CredentialsSignin"
            ? "Email o contraseña incorrectos."
            : urlError === "Configuration"
              ? "Error de configuración de autenticación."
              : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { signIn } = await import("next-auth/react");
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error || result?.ok === false) {
        setError("Email o contraseña incorrectos");
        return;
      }

      // Verify session is actually established before redirecting.
      // Some next-auth v5 beta returns can be ambiguous, so we double-check.
      const { getSession } = await import("next-auth/react");
      const session = await getSession();
      if (!session?.user?.role) {
        setError("No se pudo iniciar sesión. Intenta de nuevo.");
        return;
      }

      // Full page reload so the session cookie is read server-side
      // and /auth/redirect routes based on role (admin/kitchen/waiter)
      window.location.replace("/auth/redirect");
    } catch {
      setError("Error al iniciar sesión. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      const { signIn } = await import("next-auth/react");
      await signIn("google", { callbackUrl: "/auth/redirect" });
    } catch {
      setError("Error al iniciar sesión con Google.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-app px-4">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-elevated ring-1 ring-border/60">
          {/* Logo / Name */}
          <div className="mb-8 flex flex-col items-center text-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={restaurantName}
                className="mb-3 h-16 w-auto max-w-full object-contain"
              />
            ) : (
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
                <Lock className="h-6 w-6" />
              </div>
            )}
            {!logoUrl && (
              <h1 className="font-display text-2xl font-bold text-text-main">
                {restaurantName}
              </h1>
            )}
            <p className="mt-1 text-sm text-text-muted">
              Acceso al panel de administración
            </p>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-main shadow-sm transition-all duration-200 hover:bg-bg-app hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
            ) : (
              <GoogleIcon />
            )}
            {isGoogleLoading ? "Redirigiendo..." : "Continuar con Google"}
          </button>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-text-muted">
              o con tu cuenta
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Credentials form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-bg-app py-3 pl-10 pr-4 text-sm text-text-main outline-none transition-colors placeholder:text-text-muted/60 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                  placeholder="tu@email.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-bg-app py-3 pl-10 pr-11 text-sm text-text-main outline-none transition-colors placeholder:text-text-muted/60 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-main"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-error/8 px-4 py-3 text-sm font-medium text-error ring-1 ring-error/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all duration-200 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ingresando...
                </span>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-text-muted/60">
          Solo personal autorizado · {restaurantName}
        </p>
      </div>
    </div>
  );
}
