import { NextResponse } from "next/server";
import { db } from "@/lib/config";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roundId = searchParams.get("roundId");

  if (!roundId) {
    return NextResponse.json("roundId requerido", { status: 400 });
  }

  const round = await db.getRoundById(roundId);
  if (!round) {
    return NextResponse.json("Ronda no encontrada", { status: 404 });
  }

  const project = await db.getProjectById(round.projectId);
  if (!project) {
    return NextResponse.json("Proyecto no encontrado", { status: 404 });
  }

  const dt = new Date(round.deadlineAt);
  const dtEnd = new Date(dt.getTime() + 30 * 60 * 1000);

  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}00Z`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Smart Pre-Sale//Round Deadline//ES",
    "BEGIN:VEVENT",
    `UID:${round.id}@smart-presale`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(dt)}`,
    `DTEND:${fmt(dtEnd)}`,
    `SUMMARY:Fecha límite - ${project.name}`,
    `DESCRIPTION:Fecha límite para completar la preventa del proyecto ${project.name}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="round-${round.id}.ics"`
    }
  });
}

