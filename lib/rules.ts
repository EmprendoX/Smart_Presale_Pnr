import { Reservation, Round, RoundStatus } from "./types";

export const isExpired = (round: Round) => new Date(round.deadlineAt).getTime() <= Date.now();


export const computeProgress = (round: Round, reservations: Reservation[]) => {
  const confirmed = reservations.filter(r => r.status === "confirmed" || r.status === "assigned");
  const confirmedSlots = confirmed.reduce((a, r) => a + r.slots, 0);
  const confirmedAmount = confirmed.reduce((a, r) => a + r.amount, 0);
  let percent = 0;
  let totalSlots = reservations.reduce((a, r) => a + r.slots, 0);
  let totalAmount = reservations.reduce((a, r) => a + r.amount, 0);
  if (round.goalType === "reservations") {
    percent = Math.min(100, Math.round((confirmedSlots / round.goalValue) * 100));
  } else {
    percent = Math.min(100, Math.round((confirmedAmount / round.goalValue) * 100));
  }
  return { totalSlots, confirmedSlots, totalAmount, confirmedAmount, percent };
};

export const nextRoundStatus = (round: Round, progressPercent: number): RoundStatus => {
  if (progressPercent >= 100) return "fulfilled";
  if (isExpired(round)) {
    if (round.rule === "all_or_nothing") return "not_met";
    return progressPercent >= round.partialThreshold * 100 ? "closed" : "not_met";
  }
  if (progressPercent >= 80) return "nearly_full";
  return "open";
};


