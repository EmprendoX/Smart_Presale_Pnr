import { InputHTMLAttributes } from "react";
import { clsx } from "clsx";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm placeholder:text-neutral-400 focus:border-brand focus:ring-1 focus:ring-brand",
        props.className
      )}
    />
  );
}


