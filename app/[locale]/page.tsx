import { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { listPublishedProjects } from "@/lib/mockdb";
import { getAuthenticatedUser } from "@/lib/auth/roles";
import { fmtCurrency } from "@/lib/format";
import { Project } from "@/lib/types";

export const revalidate = 0;

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? "tenant_default";

type Params = { locale: string };

type ListingCardProps = {
  project: Project;
  locale: string;
  t: (key: string, values?: Record<string, any>) => string;
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "home" });
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

const PROJECT_IMAGE_PLACEHOLDER = "/images/project-placeholder.svg";
const PROJECT_IMAGE_BLUR =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMCA2Jz48cmVjdCB3aWR0aD0nMTAnIGhlaWdodD0nNicgZmlsbD0nJTIzZTVlN2ViJy8+PHJlY3Qgd2lkdGg9JzEwJyBoZWlnaHQ9JzMnIGZpbGw9JyUyM2Y0ZjRmNScvPjwvc3ZnPg==";

const ListingCard = ({ project, locale, t }: ListingCardProps) => {
  const price = project.askingPrice
    ? fmtCurrency(project.askingPrice, project.currency, locale)
    : null;
  const propertyType = project.propertyType;
  const coverImage = project.images?.[0] ?? PROJECT_IMAGE_PLACEHOLDER;

  return (
    <Card className="group overflow-hidden rounded-2xl border border-[color:var(--line)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
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
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[color:var(--text-strong)]">{project.name}</h3>
            <p className="text-sm text-[color:var(--text-muted)]">
              {project.city}, {project.country}
            </p>
          </div>
          {propertyType ? (
            <p className="text-sm text-[color:var(--text-muted)]">{propertyType}</p>
          ) : null}
          {price ? (
            <p className="text-sm font-medium text-[color:var(--text-strong)]">
              {t("listing.price", { price })}
            </p>
          ) : null}
          <Link
            href={`/p/${project.slug}`}
            className="inline-flex text-sm font-medium text-[color:var(--brand-primary)] hover:text-[color:var(--brand-primary-hover)] hover:underline transition-colors"
          >
            {t("listing.viewDetail")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default async function HomePage({ params }: { params: Params }) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "home" });
  const request = {
    headers: headers(),
    cookies: cookies(),
    nextUrl: { pathname: `/${locale}` }
  } as any;

  const user = await getAuthenticatedUser(request);
  const tenantId = (user?.metadata?.tenantId as string | undefined) || DEFAULT_TENANT_ID;
  const projects = await listPublishedProjects({ tenantId });

  const presaleListings = projects.filter(project => project.listingType === "presale");

  return (
    <div className="space-y-12">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[color:var(--bg-surface)] via-[color:var(--bg-soft)] to-[color:var(--bg-soft)] px-4 md:px-6 lg:px-10 py-12 shadow-lg border border-[color:var(--line)]">
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold md:text-4xl text-[color:var(--brand-primary-hover)]">{t("hero.title")}</h1>
            <p className="text-lg text-[color:var(--brand-primary)]">{t("hero.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/projects#presale"
              className="inline-flex items-center rounded-lg bg-[color:var(--brand-primary)] px-6 py-3 text-sm font-semibold text-[color:var(--text-inverse)] shadow-md hover:bg-[color:var(--brand-primary-hover)] hover:shadow-lg transition-all duration-200"
            >
              {t("hero.ctaPresale")}
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-[color:var(--text-strong)]">{t("shortcuts.title")}</h2>
          <p className="text-sm text-[color:var(--text-muted)]">{t("shortcuts.subtitle")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-1">
          <div className="min-w-0">
            <Card className="border-[color:var(--line)] shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="space-y-3 p-6">
                <h3 className="text-lg font-semibold text-[color:var(--text-strong)]">{t("shortcuts.presale.title")}</h3>
                <p className="text-sm text-[color:var(--text-muted)]">{t("shortcuts.presale.description")}</p>
                <Link href="/projects#presale" className="inline-flex text-sm font-medium text-[color:var(--brand-primary)] hover:text-[color:var(--brand-primary-hover)] hover:underline transition-colors">
                  {t("shortcuts.presale.cta")}
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-[color:var(--text-strong)]">{t("search.title")}</h2>
          <p className="text-sm text-[color:var(--text-muted)]">{t("search.subtitle")}</p>
        </div>
        <form className="flex flex-col gap-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-surface)] p-6 shadow-sm sm:flex-row">
          <div className="flex-1">
            <Input placeholder={t("search.placeholder") as string} />
          </div>
          <Button type="button" variant="secondary" className="sm:w-auto">
            {t("search.cta")}
          </Button>
        </form>
      </section>

      <section id="presale" className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-[color:var(--text-strong)]">{t("sections.presaleHeading")}</h2>
          <p className="text-sm text-[color:var(--text-muted)]">{t("sections.presaleDescription")}</p>
        </div>
        {presaleListings.length === 0 ? (
          <Card className="border-[color:var(--line)]">
            <CardContent className="py-8 text-center text-sm text-[color:var(--text-muted)]">
              {t("sections.presaleEmpty")}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {presaleListings.map(project => (
              <div key={project.id} className="min-w-0">
                <ListingCard project={project} locale={locale} t={t} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-[color:var(--text-strong)]">{t("quickLinks.title")}</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/projects#presale"
            className="inline-flex items-center justify-center rounded-lg border border-[color:var(--line)] px-4 py-2 text-sm font-medium text-[color:var(--brand-primary-hover)] shadow-sm hover:bg-[color:var(--bg-soft)] hover:shadow-md transition-all"
          >
            {t("quickLinks.presale")}
          </Link>
        </div>
      </section>
    </div>
  );
}
