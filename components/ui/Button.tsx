import { ButtonHTMLAttributes } from "react";
import React from "react";
import { clsx } from "clsx";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
};

export function Button({ className, variant = "primary", size = "md", asChild, children, ...props }: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-transparent font-semibold shadow-sm transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--tenant-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--tenant-background)] disabled:pointer-events-none disabled:opacity-60";
  const variants = {
    primary:
      "bg-[color:var(--tenant-primary)] text-[color:var(--tenant-primary-contrast)] border-[color:var(--tenant-primary)] hover:bg-[color:var(--tenant-primary-hover)] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
    secondary:
      "bg-[color:var(--tenant-surface)] text-[color:var(--tenant-foreground)] border-[color:var(--tenant-primary-soft)] hover:bg-[color:var(--tenant-primary-soft)] hover:text-[color:var(--tenant-foreground)] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
    ghost:
      "bg-transparent text-[color:var(--tenant-foreground)] border-transparent hover:bg-[color:var(--tenant-primary-soft)] hover:border-[color:var(--tenant-primary-soft)] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
  }[variant];
  const sizes = { sm: "px-2.5 py-1.5 text-sm", md: "px-4 py-2.5", lg: "px-6 py-3 text-lg" }[size];
  const classes = clsx(base, variants, sizes, className);
  
  if (asChild && children) {
    const child = children as React.ReactElement;
    return React.cloneElement(child, { className: clsx(classes, child.props.className) });
  }
  
  return <button className={classes} {...props}>{children}</button>;
}

