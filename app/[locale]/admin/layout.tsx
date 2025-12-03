import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getServerComponentUser, requireRole } from "@/lib/auth/roles";

interface AdminLayoutProps {
  children: ReactNode;
  params: {
    locale: string;
  };
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale } = params;

  const user = await getServerComponentUser();

  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/${locale}/admin`);
  }

  if (!requireRole(user, ["admin"])) {
    return (
      <div className="container py-12">
        <Card>
          <CardHeader>
            <h1 className="text-2xl font-semibold text-[color:var(--text-strong)]">
              Acceso restringido
            </h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[color:var(--text-muted)]">
              No tienes permisos para acceder al panel de administración.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="primary">
                <Link href={`/${locale}/dashboard`}>Ir a mi panel</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={`/${locale}`}>
                  Volver al inicio
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
