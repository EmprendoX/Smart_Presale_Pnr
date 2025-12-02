import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { db } from "@/lib/config";
import { Project, Reservation } from "@/lib/types";
import { fmtCurrency } from "@/lib/format";
import { getAuthenticatedUser } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export const revalidate = 0;

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "admin" });
  return {
    title: t("title"),
    description: t("description")
  };
}

export default async function AdminPage({ params }: { params: Params }) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "admin" });

  // Verificar que el usuario sea admin
  const headersList = headers();
  const request = {
    headers: headersList,
    nextUrl: { pathname: `/admin` }
  } as any;
  
  const user = await getAuthenticatedUser(request);
  
  if (!user || user.role !== 'admin') {
    redirect(`/${locale}/dashboard`);
  }

  let allProjects: Project[] = [];
  let allReservations: Reservation[] = [];
  
  try {
    allProjects = await db.getProjects();
    allReservations = await db.getReservations();
  } catch (error) {
    console.error("[AdminPage] Error loading data:", error);
  }

  const stats = {
    totalProjects: allProjects.length,
    publishedProjects: allProjects.filter(p => p.status === "published").length,
    draftProjects: allProjects.filter(p => p.status === "draft").length,
    totalReservations: allReservations.length,
    confirmedReservations: allReservations.filter(r => r.status === "confirmed").length,
    pendingReservations: allReservations.filter(r => r.status === "pending").length
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[color:var(--text-strong)]">
            {t("title")}
          </h1>
          <p className="text-sm text-[color:var(--text-muted)] mt-2">
            {t("description")}
          </p>
        </div>
        <Link href="/admin/projects/new">
          <Button variant="primary">
            {t("newProject")}
          </Button>
        </Link>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-[color:var(--text-muted)]">{t("stats.totalProjects")}</div>
            <div className="text-2xl font-semibold text-[color:var(--text-strong)] mt-1">
              {stats.totalProjects}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-[color:var(--text-muted)]">{t("stats.published")}</div>
            <div className="text-2xl font-semibold text-green-600 mt-1">
              {stats.publishedProjects}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-[color:var(--text-muted)]">{t("stats.draft")}</div>
            <div className="text-2xl font-semibold text-yellow-600 mt-1">
              {stats.draftProjects}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-[color:var(--text-muted)]">{t("stats.totalReservations")}</div>
            <div className="text-2xl font-semibold text-[color:var(--text-strong)] mt-1">
              {stats.totalReservations}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-[color:var(--text-muted)]">{t("stats.confirmed")}</div>
            <div className="text-2xl font-semibold text-green-600 mt-1">
              {stats.confirmedReservations}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-[color:var(--text-muted)]">{t("stats.pending")}</div>
            <div className="text-2xl font-semibold text-yellow-600 mt-1">
              {stats.pendingReservations}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accesos rápidos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/projects">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-[color:var(--text-strong)] mb-2">
                {t("quickLinks.projects")}
              </h3>
              <p className="text-sm text-[color:var(--text-muted)]">
                {t("quickLinks.projectsDescription")}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/reservations">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-[color:var(--text-strong)] mb-2">
                {t("quickLinks.reservations")}
              </h3>
              <p className="text-sm text-[color:var(--text-muted)]">
                {t("quickLinks.reservationsDescription")}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/projects/new">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-[color:var(--text-strong)] mb-2">
                {t("quickLinks.createProject")}
              </h3>
              <p className="text-sm text-[color:var(--text-muted)]">
                {t("quickLinks.createProjectDescription")}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Proyectos recientes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[color:var(--text-strong)]">
              {t("recentProjects")}
            </h2>
            <Link href="/admin/projects">
              <Button variant="secondary" size="sm">
                {t("viewAll")}
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {allProjects.length === 0 ? (
            <div className="text-center py-8 text-[color:var(--text-muted)]">
              {t("noProjects")}
            </div>
          ) : (
            <div className="space-y-3">
              {allProjects.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-[color:var(--text-strong)]">
                      {project.name}
                    </div>
                    <div className="text-sm text-[color:var(--text-muted)]">
                      {project.city}, {project.country} • {t(`status.${project.status}`)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/projects/${project.slug}`}>
                      <Button variant="secondary" size="sm">
                        {t("view")}
                      </Button>
                    </Link>
                    <Link href={`/admin/projects/${project.slug}/edit`}>
                      <Button variant="primary" size="sm">
                        {t("edit")}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
