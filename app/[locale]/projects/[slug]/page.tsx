import { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { findProjectBySlug, findRoundByProject, byRoundReservations } from "@/lib/mockdb";
import { computeProgress } from "@/lib/rules";
import { fmtCurrency } from "@/lib/format";
import Gallery from "@/components/Gallery";
import { VideoPlayer } from "@/components/VideoPlayer";
import { DocumentList } from "@/components/DocumentList";
import { Progress } from "@/components/Progress";
import Countdown from "@/components/Countdown";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { db } from "@/lib/config";
import { getAuthenticatedUser } from "@/lib/auth/roles";

export const revalidate = 0;

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? "tenant_default";

type Params = { locale: string; slug: string };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const project = await findProjectBySlug(params.slug);
  if (!project) return {};
  
  const title = project.seo?.title || `${project.name} · Smart Presale`;
  const description = project.seo?.description || project.description;
  const image = project.seo?.image || project.images?.[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [image] : undefined,
      type: "website"
    },
    alternates: {
      canonical: `/${params.locale}/projects/${project.slug}`
    }
  };
}

export default async function ProjectDetailPage({ params }: { params: Params }) {
  const { locale, slug } = params;
  const t = await getTranslations({ locale });
  const request = {
    headers: headers(),
    cookies: cookies(),
    nextUrl: { pathname: `/${locale}/projects/${slug}` }
  } as any;

  const user = await getAuthenticatedUser(request);

  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/${locale}/projects/${slug}`);
  }

  const tenantId = (user?.metadata?.tenantId as string | undefined) || DEFAULT_TENANT_ID;
  const project = await findProjectBySlug(slug);

  if (!project || project.status !== "published" || (project.tenantId || DEFAULT_TENANT_ID) !== tenantId) {
    return notFound();
  }

  const round = await findRoundByProject(project.id);
  const reservations = round ? await byRoundReservations(round.id) : [];
  const summary = round ? computeProgress(round, reservations) : null;
  const documents = await db.getDocumentsByProjectId(project.id);

  return (
    <div className="space-y-6">
      {/* Header con información básica */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold text-[color:var(--text-strong)]">
            {project.name}
          </h1>
          <p className="text-lg text-[color:var(--text-muted)] mt-2">
            {project.city}, {project.country}
          </p>
        </div>

        {/* Barra de progreso y countdown para preventas */}
        {round && summary && (
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-3">
                <Progress
                  value={summary.percent}
                  label={t("project.progress.label")}
                  showPercentage={true}
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[color:var(--text-muted)]">
                    {t("project.progress.confirmed", {
                      confirmed: summary.confirmedSlots,
                      total: round.goalValue
                    })}
                  </span>
                  <span className="text-[color:var(--text-muted)]">
                    {t("project.progress.deadline")}: <Countdown deadline={round.deadlineAt} />
                  </span>
                </div>
                <div className="text-sm text-[color:var(--text-strong)]">
                  {t("project.progress.depositPerSlot")}:{" "}
                  {fmtCurrency(round.depositAmount, project.currency, locale)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      {/* Galería de imágenes */}
      {project.images && project.images.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">{t("project.gallery")}</h2>
          </CardHeader>
          <CardContent>
            <Gallery images={project.images} />
          </CardContent>
        </Card>
      )}

      {/* Video */}
      {project.videoUrl && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">{t("project.video")}</h2>
          </CardHeader>
          <CardContent>
            <VideoPlayer url={project.videoUrl} />
          </CardContent>
        </Card>
      )}

      {/* Descripción */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">{t("project.description")}</h2>
        </CardHeader>
        <CardContent>
          <p className="text-[color:var(--text-strong)] whitespace-pre-line">
            {project.description}
          </p>
        </CardContent>
      </Card>

      {/* Documentos */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">{t("project.documents.title")}</h2>
          </CardHeader>
          <CardContent>
            <DocumentList documents={documents} />
          </CardContent>
        </Card>
      )}

      {/* Información adicional */}
      {(project.propertyType || project.developmentStage || project.attributes) && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">{t("project.additionalInfo")}</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.propertyType && (
              <div>
                <span className="text-sm font-medium text-[color:var(--text-muted)]">
                  {t("project.propertyType")}:
                </span>{" "}
                <span className="text-[color:var(--text-strong)]">{project.propertyType}</span>
              </div>
            )}
            {project.developmentStage && (
              <div>
                <span className="text-sm font-medium text-[color:var(--text-muted)]">
                  {t("project.developmentStage")}:
                </span>{" "}
                <span className="text-[color:var(--text-strong)]">{project.developmentStage}</span>
              </div>
            )}
            {project.attributes && project.attributes.length > 0 && (
              <div>
                <span className="text-sm font-medium text-[color:var(--text-muted)]">
                  {t("project.attributes")}:
                </span>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {project.attributes.map((attr, idx) => (
                    <li key={idx} className="text-[color:var(--text-strong)]">
                      {attr}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Botón de reserva */}
      {round && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="text-sm text-[color:var(--text-muted)]">
                {t("project.reserve.description")}
              </div>
              <Link href={`/projects/${project.slug}/reserve`}>
                <Button variant="primary" className="w-full sm:w-auto">
                  {t("project.reserve.button")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}



