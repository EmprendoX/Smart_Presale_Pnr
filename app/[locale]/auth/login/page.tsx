"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useAuth } from "@/providers/AuthProvider";

// Verificar si Supabase está habilitado en el cliente
// Necesitamos verificar si las variables están definidas en tiempo de compilación
const isSupabaseEnabledClient = () => {
  // Verificar si las variables de entorno están disponibles
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('[isSupabaseEnabledClient] URL:', supabaseUrl ? 'SET' : 'NOT SET');
  console.log('[isSupabaseEnabledClient] KEY:', supabaseKey ? 'SET' : 'NOT SET');
  
  return !!(supabaseUrl && supabaseKey);
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const t = useTranslations("auth");
  const { signInWithOtp } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const locale = useMemo(() => {
    const routeLocale = params?.locale;
    return typeof routeLocale === "string" ? routeLocale : Array.isArray(routeLocale) ? routeLocale[0] : "";
  }, [params]);

  const redirectPath = useMemo(() => {
    const redirectParam = searchParams.get("redirect");
    const localePrefix = locale ? `/${locale}` : "";
    return redirectParam || (localePrefix ? `${localePrefix}/dashboard` : "/dashboard");
  }, [locale, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (isSupabaseEnabledClient()) {
        // Autenticación real con Supabase OTP
        console.log('[LoginPage] Using Supabase OTP authentication');
        const result = await signInWithOtp(formData.email, {
          redirectTo: `${window.location.origin}/${locale || ""}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`,
          shouldCreateUser: true
        });

        if (result?.autoAuthenticated) {
          // Si se autentica automáticamente (modo mock), redirigir inmediatamente
          router.push(redirectPath);
        } else {
          // Mostrar mensaje de éxito para verificar email
          setSuccess(true);
        }
      } else {
        // Modo mock/demo - usar API existente
        console.log('[LoginPage] Using mock authentication');
        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Error al iniciar sesión");
        }

        setSuccess(true);
        // Redirigir al dashboard después de iniciar sesión
        setTimeout(() => {
          router.push(redirectPath);
        }, 1500);
      }
    } catch (err: any) {
      console.error('[LoginPage] Authentication error:', err);
      setError(err.message || "Ocurrió un error. Por favor intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-200px)] py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-semibold text-[color:var(--text-strong)]">
            {isSupabaseEnabledClient() ? "Acceso para Inversionistas" : t("login.title")}
          </h1>
          <p className="text-sm text-[color:var(--text-muted)] mt-2">
            {isSupabaseEnabledClient() 
              ? "Ingresa tu email para recibir un código de acceso seguro" 
              : t("login.subtitle")
            }
          </p>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="text-sm text-green-800">
                  {isSupabaseEnabledClient() 
                    ? "¡Código enviado exitosamente!" 
                    : t("login.successMessage")
                  }
                </p>
                <p className="text-xs text-green-700 mt-2">
                  {isSupabaseEnabledClient() 
                    ? "Revisa tu email y haz clic en el enlace para acceder como inversionista." 
                    : t("login.checkEmail")
                  }
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setSuccess(false);
                  setFormData({ fullName: "", email: "", phone: "" });
                }}
                className="w-full"
              >
                {t("login.sendAnother")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isSupabaseEnabledClient() && (
                <>
                  <Input
                    label={t("login.fullName")}
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    placeholder={t("login.fullNamePlaceholder")}
                  />
                  <Input
                    label={t("login.phone")}
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder={t("login.phonePlaceholder")}
                  />
                </>
              )}
              <Input
                label={isSupabaseEnabledClient() ? "Email de Inversionista" : t("login.email")}
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder={isSupabaseEnabledClient() ? "tu-email@ejemplo.com" : t("login.emailPlaceholder")}
              />
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading 
                  ? (isSupabaseEnabledClient() ? "Enviando código..." : t("login.sending"))
                  : (isSupabaseEnabledClient() ? "Enviar código de acceso" : t("login.sendCode"))
                }
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



