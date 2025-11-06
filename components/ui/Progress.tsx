export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
      <div className="h-full bg-brand transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}


