"use client";

import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Select } from "./ui/Select";
import { Button } from "./ui/Button";
import { useAuth } from "@/providers/AuthProvider";
import { useTenant } from "@/providers/TenantProvider";

export function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const { user, loading, signOut } = useAuth();
  const { tenant, settings } = useTenant();

  // Timeout de seguridad: si después de 2 segundos aún está cargando, mostrar botón
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn('[Navbar] Loading timeout reached, showing sign in button anyway');
        setLoadingTimeout(true);
      }, 2000);
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  const brandName = tenant?.name ?? "Smart Pre-Sale";
  const brandLogo = settings?.logoUrl ?? settings?.darkLogoUrl ?? settings?.squareLogoUrl ?? null;
  
  // Hooks de next-intl con manejo de errores
  let t: ReturnType<typeof useTranslations>;
  let locale: string;
  let router: ReturnType<typeof useRouter>;
  let pathname: string;
  
  try {
    t = useTranslations("nav");
    locale = useLocale();
    router = useRouter();
    pathname = usePathname();
  } catch (error) {
    // Fallback si los hooks fallan
    console.error("Error en hooks de next-intl:", error);
    return (
      <header className="border-b">
        <div className="container flex items-center justify-between py-3">
          <div className="text-xl font-semibold">Smart <span className="text-brand">Pre‑Sale</span></div>
        </div>
      </header>
    );
  }

  // Solo usar localStorage después de montar (cliente)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevenir loops infinitos en cambio de locale
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    
    try {
      const savedLocale = localStorage.getItem("sps_locale");
      if (savedLocale && savedLocale !== locale && (savedLocale === "es" || savedLocale === "en")) {
        // Solo cambiar si el locale guardado es diferente y válido
        const currentPath = pathname || "/";
        const pathWithoutLocale = currentPath.replace(/^\/(es|en)/, "") || "/";
        router.replace(pathWithoutLocale, { locale: savedLocale });
      }
    } catch (error) {
      console.error("Error en cambio de locale:", error);
    }
  }, [mounted, locale, pathname, router]);

  const changeLanguage = (newLocale: string) => {
    if (typeof window !== "undefined" && (newLocale === "es" || newLocale === "en")) {
      try {
        localStorage.setItem("sps_locale", newLocale);
        const currentPath = pathname || "/";
        const pathWithoutLocale = currentPath.replace(/^\/(es|en)/, "") || "/";
        router.replace(pathWithoutLocale, { locale: newLocale });
      } catch (error) {
        console.error("Error cambiando idioma:", error);
      }
    }
  };

  return (
    <header className="border-b overflow-x-hidden">
      <div className="container flex items-center justify-between py-3 min-w-0">
        <div className="flex items-center gap-6 min-w-0 flex-shrink-0">
          <Link href="/" className="flex items-center gap-3 text-xl font-semibold text-brand flex-shrink-0">
            {brandLogo ? (
              <img src={brandLogo} alt={brandName} className="h-8 w-auto" />
            ) : (
              <span className="leading-none">{brandName}</span>
            )}
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm flex-shrink-0">
            <Link href="/" className="hover:underline whitespace-nowrap">{t("projects")}</Link>
            <Link href="/dashboard" className="hover:underline whitespace-nowrap">{t("myReservations")}</Link>
            <Link href="/dev" className="hover:underline whitespace-nowrap">{t("devPanel")}</Link>
            <Link href="/community" className="hover:underline whitespace-nowrap">{t("communities")}</Link>
            <Link href="/admin" className="hover:underline whitespace-nowrap">{t("admin")}</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
          <Select value={locale} onChange={e => changeLanguage(e.target.value)} aria-label={t("language")}>
            <option value="es">{t("spanish")}</option>
            <option value="en">{t("english")}</option>
          </Select>
          {(loading && !loadingTimeout) ? (
            <div className="h-9 w-20 bg-[color:var(--bg-soft)] animate-pulse rounded-md"></div>
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="text-sm text-[color:var(--text-muted)]">
                <p className="font-medium text-[color:var(--text-strong)]">{user.fullName || user.email}</p>
                <p className="text-xs capitalize text-[color:var(--text-muted)]">
                  {t(`roles.${user.role}` as any)}
                </p>
              </div>
              <Button variant="secondary" onClick={() => signOut().catch(error => console.error('Error al cerrar sesión:', error))}>
                {t("signOut")}
              </Button>
            </div>
          ) : (
            <Button variant="secondary" asChild>
              <Link href="/sign-up">{t("signIn")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}


