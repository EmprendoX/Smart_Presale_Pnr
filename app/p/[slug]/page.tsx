import { notFound } from "next/navigation";
import { findProjectBySlug, findRoundByProject, byRoundReservations } from "@/lib/mockdb";
import FinancialHeader from "@/components/FinancialHeader";
import Gallery from "@/components/Gallery";
import FeatureGrid from "@/components/FeatureGrid";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { fmtCurrency, shortDate } from "@/lib/format";
import { computeProgress } from "@/lib/rules";
import { Tabs } from "@/components/ui/Tabs";
import LineChart from "@/components/charts/LineChart";
import StudyList from "@/components/StudyList";
import SecondaryMarketPanel from "@/components/SecondaryMarketPanel";
import ReserveDialog from "@/components/ReserveDialog";
import { DocumentList } from "@/components/DocumentList";
import Link from "next/link";
import { db } from "@/lib/config";

export const revalidate = 0;

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await findProjectBySlug(slug);
  if (!project) return notFound();

  const round = await findRoundByProject(project.id);
  const reservations = round ? await byRoundReservations(round.id) : [];
  const summary = round ? computeProgress(round, reservations) : null;

  const priceHistory = await db.getPriceHistoryByProjectId(project.id);
  const research = await db.getResearchByProjectId(project.id);
  const documents = await db.getDocumentsByProjectId(project.id);

  const kpis = (() => {
    const list: { label: string; value: string }[] = [];
    if (project.totalUnits) {
      const confirmed = summary?.confirmedSlots ?? 0;
      const available = project.totalUnits - confirmed;
      list.push({ label: "Unidades totales", value: String(project.totalUnits) });
      list.push({ label: "Disponibles", value: String(Math.max(available, 0)) });
    }
    if (round?.groupSlots) list.push({ label: "Grupo de preventa", value: String(round.groupSlots) });
    if (round) list.push({ label: "Depósito / slot", value: fmtCurrency(round.depositAmount, project.currency) });
    if (round) list.push({ label: "Fecha límite", value: shortDate(round.deadlineAt) });
    return list;
  })();

  const tabOverview = (
    <div className="space-y-6">
      {/* Información de propiedad destacada */}
      {(project.propertyType || project.propertyPrice || project.developmentStage || project.propertyDetails) && (
        <Card>
          <CardHeader><h3 className="text-lg">Información de la propiedad</h3></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.propertyType && (
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-neutral-500">Tipo de propiedad</div>
                  <div className="font-medium text-base mt-1">{project.propertyType}</div>
                </div>
              )}
              {project.propertyPrice && (
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-neutral-500">Costo de la propiedad</div>
                  <div className="font-medium text-base mt-1">
                    {fmtCurrency(project.propertyPrice, project.currency)}
                  </div>
                </div>
              )}
              {project.developmentStage && (
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-neutral-500">Etapa de desarrollo</div>
                  <div className="font-medium text-base mt-1">{project.developmentStage}</div>
                </div>
              )}
              {project.propertyDetails?.bedrooms !== undefined && (
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-neutral-500">Recámaras</div>
                  <div className="font-medium text-base mt-1">{project.propertyDetails.bedrooms}</div>
                </div>
              )}
              {project.propertyDetails?.bathrooms !== undefined && (
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-neutral-500">Baños completos</div>
                  <div className="font-medium text-base mt-1">{project.propertyDetails.bathrooms}</div>
                </div>
              )}
              {project.propertyDetails?.halfBathrooms !== undefined && (
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-neutral-500">Medios baños</div>
                  <div className="font-medium text-base mt-1">{project.propertyDetails.halfBathrooms}</div>
                </div>
              )}
              {project.propertyDetails?.surfaceArea !== undefined && (
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-neutral-500">Superficie</div>
                  <div className="font-medium text-base mt-1">{project.propertyDetails.surfaceArea} m²</div>
                </div>
              )}
              {project.propertyDetails?.parkingSpaces !== undefined && (
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-neutral-500">Estacionamientos</div>
                  <div className="font-medium text-base mt-1">{project.propertyDetails.parkingSpaces}</div>
                </div>
              )}
              {project.propertyDetails?.floors !== undefined && (
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-neutral-500">Niveles/Pisos</div>
                  <div className="font-medium text-base mt-1">{project.propertyDetails.floors}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {project.videoUrl && (
        <Card>
          <CardHeader><h3 className="text-lg">Video promocional</h3></CardHeader>
          <CardContent>
            <VideoPlayer url={project.videoUrl} />
          </CardContent>
        </Card>
      )}
      <Gallery images={project.images} />
      <FeatureGrid attributes={project.attributes} specs={project.specs} />
      <Card>
        <CardHeader><h3 className="text-lg">Zona y entorno</h3></CardHeader>
        <CardContent className="text-sm text-neutral-800 space-y-2">
          <p>{project.zone?.summary}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-neutral-500">Golf</div>
              <ul className="list-disc pl-5">
                {project.zone?.golf?.map(g => <li key={g}>{g}</li>)}
              </ul>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Colegios</div>
              <ul className="list-disc pl-5">
                {project.zone?.schools?.map(g => <li key={g}>{g}</li>)}
              </ul>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Transporte</div>
              <ul className="list-disc pl-5">
                {project.zone?.transport?.map(g => <li key={g}>{g}</li>)}
              </ul>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Comercio</div>
              <ul className="list-disc pl-5">
                {project.zone?.retail?.map(g => <li key={g}>{g}</li>)}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const tabResearch = (
    <div className="space-y-6">
      <Card>
        <CardHeader><h3 className="text-lg">Estudios, reportes, noticias y datos</h3></CardHeader>
        <CardContent><StudyList items={research} /></CardContent>
      </Card>
    </div>
  );

  const tabDocuments = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg">Documentos del proyecto</h3>
          <p className="text-sm text-neutral-600 mt-1">
            Documentos disponibles para transparencia y seguridad
          </p>
        </CardHeader>
        <CardContent>
          <DocumentList documents={documents} />
        </CardContent>
      </Card>
    </div>
  );

  const tabMarket = (
    <div className="space-y-6">
      <Card>
        <CardHeader><h3 className="text-lg">Precio por slot (histórico)</h3></CardHeader>
        <CardContent>
          <LineChart data={priceHistory} />
          {priceHistory.length > 1 && (
            <div className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-md border p-2">
                <div className="text-xs text-neutral-500">Último</div>
                <div className="font-medium">{priceHistory[priceHistory.length - 1].price} {project.currency}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-neutral-500">Primero</div>
                <div className="font-medium">{priceHistory[0].price} {project.currency}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-neutral-500">Variación</div>
                <div className="font-medium">
                  {((priceHistory[priceHistory.length - 1].price - priceHistory[0].price) / priceHistory[0].price * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          )}
          <p className="mt-2 text-xs text-neutral-500">*Curva se actualiza con trades del mercado secundario (mock).</p>
        </CardContent>
      </Card>
    </div>
  );

  const tabSecondary = round ? (
    <SecondaryMarketPanel projectId={project.id} roundId={round.id} currency={project.currency} />
  ) : (
    <Card>
      <CardContent className="py-8 text-center text-neutral-600">
        Este proyecto no tiene una ronda activa.
      </CardContent>
    </Card>
  );

  const tabTimeline = (
    <div className="space-y-6">
      <Card>
        <CardHeader><h3 className="text-lg">Hitos</h3></CardHeader>
        <CardContent className="text-sm">
          <ul className="list-disc pl-5 space-y-1">
            <li>Inicio de preventa: {shortDate(project.createdAt)}</li>
            {round && (
              <li>
                Fecha límite actual: {shortDate(round.deadlineAt)} (
                <a className="text-brand hover:underline" href={`/api/ics-round?roundId=${round.id}`}>
                  Agregar a calendario (.ics)
                </a>)
              </li>
            )}
            <li>Entrega estimada: {project.specs?.["Entrega"] ?? "—"}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <FinancialHeader
        name={project.name}
        ticker={project.ticker}
        deadlineAt={round?.deadlineAt}
        percent={summary?.percent ?? 0}
        kpis={kpis}
        status={round?.status ?? "open"}
      />

      <Tabs
        tabs={[
          { key: "overview", label: "Resumen", content: tabOverview },
          { key: "documents", label: "Documentos", content: tabDocuments },
          { key: "research", label: "Estudios y datos", content: tabResearch },
          { key: "market", label: "Mercado (precio)", content: tabMarket },
          { key: "secondary", label: "Secundario (reventa)", content: tabSecondary },
          { key: "timeline", label: "Cronograma", content: tabTimeline }
        ]}
      />

      {round && (
        <Card>
          <CardHeader><h3 className="text-lg">Acciones</h3></CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-neutral-700">
              {round.groupSlots ? `Grupo: ${round.groupSlots} slots. ` : ""}
              Depósito por slot: {fmtCurrency(round.depositAmount, project.currency)}.
            </div>
            <div className="flex items-center gap-2">
              <ReserveDialog project={project} round={round} />
              <Link href={`/dashboard`} className="text-brand hover:underline text-sm">Ver mis reservas →</Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
