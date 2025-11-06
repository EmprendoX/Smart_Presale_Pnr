import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Navbar } from "@/components/Navbar";
import { ToastProvider } from "@/components/ui/Toast";
import "../globals.css";

// Mensajes por defecto como fallback
const defaultMessages = {
  nav: {
    projects: "Proyectos",
    myReservations: "Mis Reservas",
    devPanel: "Panel Dev",
    admin: "Admin",
    language: "Idioma",
    spanish: "Español",
    english: "English",
    howItWorks: "Cómo funciona"
  },
  home: {
    title: "Proyectos Verificados",
    published: "Publicado",
    progress: "Progreso",
    deposit: "Depósito",
    viewDetail: "Ver detalle →"
  }
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Obtener mensajes con manejo de errores
  let messages: any = defaultMessages;
  try {
    const loadedMessages = await getMessages();
    // Verificar que messages sea un objeto válido
    if (loadedMessages && typeof loadedMessages === 'object') {
      messages = loadedMessages;
    }
  } catch (error: any) {
    // Silenciar errores de NEXT_NOT_FOUND durante el build
    if (error?.digest !== 'NEXT_NOT_FOUND') {
      console.error('Error loading messages, using defaults:', error);
    }
    messages = defaultMessages;
  }

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ToastProvider>
            <Navbar />
            <main className="container py-8">{children}</main>
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

