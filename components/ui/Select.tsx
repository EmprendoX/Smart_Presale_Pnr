import { SelectHTMLAttributes } from "react";
import { clsx } from "clsx";

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:ring-1 focus:ring-brand",
        props.className
      )}
    />
  );
}


