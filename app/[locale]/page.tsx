import { Metadata } from "next";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { listPublishedProjects } from "@/lib/mockdb";
import { fmtCurrency } from "@/lib/format";
import { Project } from "@/lib/types";

export const revalidate = 0;

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
    <Card className="group overflow-hidden rounded-2xl border border-blue-100 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <CardContent className="p-0">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-blue-50">
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
            <h3 className="text-lg font-semibold text-neutral-900">{project.name}</h3>
            <p className="text-sm text-neutral-600">
              {project.city}, {project.country}
            </p>
          </div>
          {propertyType ? (
            <p className="text-sm text-neutral-500">{propertyType}</p>
          ) : null}
          {price ? (
            <p className="text-sm font-medium text-neutral-900">
              {t("listing.price", { price })}
            </p>
          ) : null}
          <Link
            href={`/p/${project.slug}`}
            className="inline-flex text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
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
  const projects = await listPublishedProjects();

  const immediateListings = projects.filter(project => project.listingType === "sale");
  const presaleListings = projects.filter(project => project.listingType === "presale");

  return (
    <div className="space-y-12">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-white via-blue-50 to-cyan-50 px-10 py-12 shadow-lg border border-blue-100">
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold md:text-4xl text-blue-700">{t("hero.title")}</h1>
            <p className="text-lg text-blue-600">{t("hero.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/projects#sale"
              className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 hover:shadow-lg transition-all duration-200"
            >
              {t("hero.ctaImmediate")}
            </Link>
            <Link
              href="/projects#presale"
              className="inline-flex items-center rounded-lg border-2 border-blue-600 bg-white px-6 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 hover:shadow-md transition-all duration-200"
            >
              {t("hero.ctaPresale")}
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-neutral-900">{t("shortcuts.title")}</h2>
          <p className="text-sm text-neutral-600">{t("shortcuts.subtitle")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-blue-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="space-y-3 p-6">
              <h3 className="text-lg font-semibold text-neutral-900">{t("shortcuts.immediate.title")}</h3>
              <p className="text-sm text-neutral-600">{t("shortcuts.immediate.description")}</p>
              <Link href="/projects#sale" className="inline-flex text-sm font-medium text-caribbean-blue-600 hover:text-caribbean-blue-700 hover:underline transition-colors">
                {t("shortcuts.immediate.cta")}
              </Link>
            </CardContent>
          </Card>
          <Card className="border-blue-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="space-y-3 p-6">
              <h3 className="text-lg font-semibold text-neutral-900">{t("shortcuts.presale.title")}</h3>
              <p className="text-sm text-neutral-600">{t("shortcuts.presale.description")}</p>
              <Link href="/projects#presale" className="inline-flex text-sm font-medium text-caribbean-blue-600 hover:text-caribbean-blue-700 hover:underline transition-colors">
                {t("shortcuts.presale.cta")}
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-neutral-900">{t("search.title")}</h2>
          <p className="text-sm text-neutral-600">{t("search.subtitle")}</p>
        </div>
        <form className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm sm:flex-row">
          <div className="flex-1">
            <Input placeholder={t("search.placeholder") as string} />
          </div>
          <Button type="button" variant="secondary" className="sm:w-auto">
            {t("search.cta")}
          </Button>
        </form>
      </section>

      <section id="sale" className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-neutral-900">{t("sections.immediateHeading")}</h2>
          <p className="text-sm text-neutral-600">{t("sections.immediateDescription")}</p>
        </div>
        {immediateListings.length === 0 ? (
          <Card className="border-blue-100">
            <CardContent className="py-8 text-center text-sm text-neutral-600">
              {t("sections.immediateEmpty")}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {immediateListings.map(project => (
              <ListingCard key={project.id} project={project} locale={locale} t={t} />
            ))}
          </div>
        )}
      </section>

      <section id="presale" className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-neutral-900">{t("sections.presaleHeading")}</h2>
          <p className="text-sm text-neutral-600">{t("sections.presaleDescription")}</p>
        </div>
        {presaleListings.length === 0 ? (
          <Card className="border-blue-100">
            <CardContent className="py-8 text-center text-sm text-neutral-600">
              {t("sections.presaleEmpty")}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {presaleListings.map(project => (
              <ListingCard key={project.id} project={project} locale={locale} t={t} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-neutral-900">{t("quickLinks.title")}</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/projects#sale"
            className="inline-flex items-center justify-center rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50 hover:shadow-md transition-all"
          >
            {t("quickLinks.immediate")}
          </Link>
          <Link
            href="/projects#presale"
            className="inline-flex items-center justify-center rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50 hover:shadow-md transition-all"
          >
            {t("quickLinks.presale")}
          </Link>
        </div>
      </section>
    </div>
  );
}
