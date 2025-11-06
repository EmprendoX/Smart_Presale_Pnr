"use client";

import { useEffect, useState } from "react";
import { daysLeft } from "@/lib/format";

export default function Countdown({ deadline }: { deadline: string }) {
  const [remain, setRemain] = useState<number>(daysLeft(deadline));

  useEffect(() => {
    const id = setInterval(() => setRemain(daysLeft(deadline)), 60_000);
    return () => clearInterval(id);
  }, [deadline]);

  return <span>{remain} días</span>;
}

