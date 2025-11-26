import { Metadata } from "next";
import Script from "next/script";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import LeadAccessGate from "@/components/LeadAccessGate";
import {
  listPublishedProjects,
  findRoundByProject,
  byRoundReservations,
  listCommunities
} from "@/lib/mockdb";
import { computeProgress } from "@/lib/rules";
import { fmtCurrency } from "@/lib/format";
import { Project, ListingType, Community } from "@/lib/types";

export const revalidate = 0;

type Params = { locale: string };

type ProjectWithMetrics = {
  project: Project;
  round: any | null;
  percent: number;
  summaryText?: string;
};

const PROJECT_IMAGE_PLACEHOLDER = "/images/project-placeholder.svg";
const PROJECT_IMAGE_BLUR =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMCA2Jz48cmVjdCB3aWR0aD0nMTAnIGhlaWdodD0nNicgZmlsbD0nJTIzZTVlN2ViJy8+PHJlY3Qgd2lkdGg9JzEwJyBoZWlnaHQ9JzMnIGZpbGw9JyUyM2Y0ZjRmNScvPjwvc3ZnPg==";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "projects" });
  const title = t("seo.title");
  const description = t("seo.description");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://smart-presale.example/${params.locale}`,
      siteName: "Smart Presale X",
      type: "website"
    },
    alternates: {
      canonical: `/${params.locale}`
    }
  };
}

const listingLabel = (
  type: ListingType,
  t: (key: string, values?: Record<string, any>) => string
) => t("labels.presale");

const communityCTA = (
  community: Community,
  t: (key: string, values?: Record<string, any>) => string
) => (
  <Card key={community.id} className="overflow-hidden border-[color:var(--line)] shadow-sm">
    <CardContent className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Badge color={community.scope === "global" ? "green" : "neutral"}>
          {community.scope === "global" ? t("community.scope.global") : t("community.scope.campaign")}
        </Badge>
        <span className="text-xs text-[color:var(--text-muted)]">{t("community.members", { count: community.memberCount })}</span>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-[color:var(--text-strong)]">{community.name}</h3>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">{community.description}</p>
      </div>
      {community.tags?.length ? (
        <div className="flex flex-wrap gap-2 text-xs text-[color:var(--text-muted)]">
          {community.tags.map(tag => (
            <span key={tag} className="rounded-full bg-[color:var(--bg-soft)] px-2 py-1">#{tag}</span>
          ))}
        </div>
      ) : null}
      <Link href={`/community/${community.slug}`} className="inline-flex items-center text-sm font-medium text-brand hover:underline">
        {t("community.open")}
      </Link>
    </CardContent>
  </Card>
);

const renderProjectCard = (
  data: ProjectWithMetrics,
  locale: string,
  t: (key: string, values?: Record<string, any>) => string,
  href: string
) => {
  const { project, round, percent } = data;
  const isPresale = project.listingType === "presale";
  const deposit = round ? fmtCurrency(round.depositAmount, project.currency, locale) : null;
  const price = project.askingPrice ? fmtCurrency(project.askingPrice, project.currency, locale) : null;

  const coverImage = project.images?.[0] ?? PROJECT_IMAGE_PLACEHOLDER;

  return (
    <Card
      key={project.id}
      className="group overflow-hidden rounded-2xl border border-[color:var(--line)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <CardContent className="p-0">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[color:var(--bg-soft)]">
          <Image
            src={coverImage}
            alt={`Imagen del proyecto ${project.name}`}
            fill
            sizes="(min-width: 1280px) 360px, (min-width: 768px) 45vw, 90vw"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            placeholder="blur"
            blurDataURL={PROJECT_IMAGE_BLUR}
          />
        </div>
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{project.name}</h3>
              <p className="text-sm text-[color:var(--text-muted)]">{project.city}, {project.country}</p>
            </div>
            <Badge color="green">{listingLabel(project.listingType, t)}</Badge>
          </div>

          <p className="text-sm text-neutral-700 line-clamp-2">{project.description}</p>

          <div className="grid gap-3 text-xs font-medium uppercase tracking-wide text-neutral-500 sm:grid-cols-3">
            {project.stage && (
              <span>{t("labels.stage")}: <span className="text-neutral-900 normal-case">{project.stage}</span></span>
            )}
            {deposit && (
              <span>{t("labels.deposit")}: <span className="text-neutral-900 normal-case">{deposit}</span></span>
            )}
            {price && (
              <span>{t("labels.price")}: <span className="text-neutral-900 normal-case">{price}</span></span>
            )}
            {project.propertyType && (
              <span>{t("labels.propertyType")}: <span className="text-neutral-900 normal-case">{project.propertyType}</span></span>
            )}
          </div>

          {isPresale && round ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[color:var(--text-muted)]">
                <span>{t("labels.progress")}</span>
                <span>{percent}%</span>
              </div>
              <Progress value={percent} />
              <div className="flex items-center justify-between text-xs text-[color:var(--text-muted)]">
                <span>{t("labels.deadline")}</span>
                <span>{new Date(round.deadlineAt).toLocaleDateString(locale === "en" ? "en-US" : "es-MX", {
                  month: "short",
                  day: "numeric"
                })}</span>
              </div>
            </div>
          ) : null}

          <Link href={href} className="inline-flex items-center text-sm font-medium text-[color:var(--brand-primary)] hover:text-[color:var(--brand-primary-hover)] hover:underline transition-colors">
            {t("labels.openProject")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default async function ProjectsPage({ params }: { params: Params }) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "projects" });
  const projects = await listPublishedProjects();
  const communities = await listCommunities();

  const projectsWithData: ProjectWithMetrics[] = await Promise.all(
    projects.map(async project => {
      const round = project.listingType === "presale" ? await findRoundByProject(project.id) : null;
      const reservations = round ? await byRoundReservations(round.id) : [];
      const summary = round ? computeProgress(round, reservations) : null;
      return {
        project,
        round,
        percent: summary ? summary.percent : 0
      };
    })
  );

  const presaleProjects = projectsWithData.filter(p => p.project.listingType === "presale");
  const heroProject = projectsWithData.find(p => p.project.featured) ?? projectsWithData[0];
  const globalCommunity = communities.find(c => c.scope === "global");
  const campaignCommunities = communities.filter(c => c.scope === "campaign").slice(0, 3);
  const heroPrimaryLink = heroProject ? `/p/${heroProject.project.slug}` : "/";
  const heroSecondaryLink = globalCommunity ? `/community/${globalCommunity.slug}` : "/community";

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t("seo.title"),
    description: t("seo.description"),
    hasPart: projectsWithData.map(item => ({
      '@type': 'PreSale',
      name: item.project.name,
      url: `https://smart-presale.example/${locale}/p/${item.project.slug}`,
      image: item.project.images?.[0],
      description: item.project.description
    }))
  };

  return (
    <LeadAccessGate>
      <div className="space-y-12">
        <Script id="projects-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      {/* Hero */}
      {heroProject && (
        <section className="relative overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--text-strong)] text-[color:var(--text-inverse)]">
          <div className="absolute inset-0 opacity-40" style={{
            backgroundImage: heroProject.project.images?.[0] ? `url(${heroProject.project.images[0]})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }} />
          <div className="relative z-10 grid gap-6 bg-gradient-to-br from-[color:var(--text-strong)]/80 via-[color:var(--text-strong)]/60 to-transparent p-4 md:p-6 lg:p-10 md:grid-cols-2">
            <div className="space-y-4">
              <Badge color="green">{t("hero.badge")}</Badge>
              <h1 className="text-3xl font-semibold md:text-4xl">{t("hero.title")}</h1>
              <p className="text-sm text-[color:var(--text-inverse)]/80 md:text-base">{t("hero.subtitle")}</p>
              <div className="flex flex-wrap gap-3">
                <Link href={heroPrimaryLink} className="inline-flex items-center rounded-md bg-[color:var(--bg-surface)] px-4 py-2 text-sm font-medium text-[color:var(--text-strong)] shadow hover:bg-[color:var(--bg-soft)]">
                  {t("hero.ctaPrimary")}
                </Link>
                <Link href={heroSecondaryLink} className="inline-flex items-center rounded-md border border-[color:var(--text-inverse)]/40 px-4 py-2 text-sm font-medium text-[color:var(--text-inverse)] hover:bg-[color:var(--text-inverse)]/10">
                  {t("hero.ctaSecondary")}
                </Link>
              </div>
            </div>
            <div className="grid gap-3 rounded-2xl bg-white/10 p-6 backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[color:var(--text-inverse)]/80">{t("hero.metrics.funding")}</span>
                <span className="text-lg font-semibold">{heroProject.percent}%</span>
              </div>
              <Progress value={heroProject.percent} />
              <div className="grid grid-cols-2 gap-3 text-xs text-[color:var(--text-inverse)]/90">
                <div>
                  <div className="uppercase tracking-wide text-[color:var(--text-inverse)]/70">{t("hero.metrics.stage")}</div>
                  <div className="text-sm font-medium">{heroProject.project.stage ?? t("labels.stageUnknown")}</div>
                </div>
                <div>
                  <div className="uppercase tracking-wide text-[color:var(--text-inverse)]/70">{t("hero.metrics.deposit")}</div>
                  <div className="text-sm font-medium">
                    {heroProject.round ? fmtCurrency(heroProject.round.depositAmount, heroProject.project.currency, locale) : t("labels.notApplicable")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Search */}
      <section className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-surface)] p-4 md:p-6 shadow-sm">
        <form className="grid gap-4 md:grid-cols-4">
          <Input placeholder={t("search.cityPlaceholder") as string} />
          <Select defaultValue="presale">
            <option value="presale">{t("labels.presale")}</option>
          </Select>
          <Select defaultValue="any">
            <option value="any">{t("search.priceAny")}</option>
            <option value="under-250">{t("search.priceLow")}</option>
            <option value="250-500">{t("search.priceMid")}</option>
            <option value="500-plus">{t("search.priceHigh")}</option>
          </Select>
          <Button type="button" variant="secondary">{t("search.cta")}</Button>
        </form>
      </section>

      {/* Presale */}
      <section id="presale" className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{t("sections.presaleHeading")}</h2>
            <p className="text-sm text-[color:var(--text-muted)]">{t("sections.presaleSubheading")}</p>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-brand hover:underline">{t("sections.viewDashboard")}</Link>
        </div>
        {presaleProjects.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-[color:var(--text-muted)]">{t("sections.noPresale")}</CardContent></Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {presaleProjects.map(item => (
              <div key={item.project.id} className="min-w-0">
                {renderProjectCard(item, locale, t, `/p/${item.project.slug}`)}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Communities */}
      <section className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{t("sections.communityHeading")}</h2>
            <p className="text-sm text-[color:var(--text-muted)]">{t("sections.communitySubheading")}</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {globalCommunity ? (
            <div key={globalCommunity.id} className="min-w-0">
              {communityCTA(globalCommunity, t)}
            </div>
          ) : null}
          {campaignCommunities.map(community => (
            <div key={community.id} className="min-w-0">
              {communityCTA(community, t)}
            </div>
          ))}
        </div>
      </section>
      </div>
    </LeadAccessGate>
  );
}
