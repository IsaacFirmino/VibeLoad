/* eslint-disable react/prop-types -- Native React attribute types cover this shadcn component. */
import React from "react";

import { cn } from "@/lib/utils";

const primaryButtonClasses =
  "primary-button inline-flex h-11 cursor-pointer items-center justify-center px-8 py-2 font-medium disabled:pointer-events-none disabled:opacity-50";

type RainbowButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

type RainbowLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;

function RainbowButtonContent({ children }: { children: React.ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>;
}

export function RainbowButton({
  children,
  className,
  ...props
}: RainbowButtonProps) {
  return (
    <button className={cn(primaryButtonClasses, className)} {...props}>
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
    <a className={cn(primaryButtonClasses, className)} {...props}>
      <RainbowButtonContent>{children}</RainbowButtonContent>
    </a>
  );
}
