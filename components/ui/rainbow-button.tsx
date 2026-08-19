/* eslint-disable react/prop-types -- Native React attribute types cover this shadcn component. */
import React from "react";

import { cn } from "@/lib/utils";

const rainbowButtonClasses = [
  "group relative isolate inline-flex h-11 animate-rainbow cursor-pointer items-center justify-center rounded-xl border-0 bg-[length:200%] px-8 py-2 font-medium text-primary-foreground transition-[transform,color] [background-clip:padding-box,border-box,border-box] [background-origin:border-box] [border:calc(0.08*1rem)_solid_transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-px active:scale-[0.98]",
  "before:pointer-events-none before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,hsl(var(--color-1)),hsl(var(--color-5)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)))] before:bg-[length:200%] before:[filter:blur(calc(0.8*1rem))]",
  "bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,hsl(var(--color-1)),hsl(var(--color-5)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)))]",
  "dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,hsl(var(--color-1)),hsl(var(--color-5)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)))]",
];

type RainbowButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

type RainbowLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;

function RainbowButtonContent({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="relative z-[1] whitespace-nowrap"
      style={{ color: "var(--button-text)" }}
    >
      {children}
    </span>
  );
}

export function RainbowButton({
  children,
  className,
  ...props
}: RainbowButtonProps) {
  return (
    <button className={cn(rainbowButtonClasses, className)} {...props}>
      <RainbowButtonContent>{children}</RainbowButtonContent>
    </button>
  );
}

export function RainbowLink({
  children,
  className,
  ...props
}: RainbowLinkProps) {
  return (
    <a className={cn(rainbowButtonClasses, className)} {...props}>
      <RainbowButtonContent>{children}</RainbowButtonContent>
    </a>
  );
}
