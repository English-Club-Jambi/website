import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export function classNames(
  ...values: Array<string | false | null | undefined>
) {
  return values.filter(Boolean).join(" ");
}

type LinkProps = {
  href: Route;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
};

export function ButtonLink({
  href,
  children,
  className,
  "aria-label": ariaLabel,
}: LinkProps) {
  return (
    <Link
      href={href}
      className={classNames("button-link", className)}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}

export function TextLink({
  href,
  children,
  className,
  "aria-label": ariaLabel,
}: LinkProps) {
  return (
    <Link
      href={href}
      className={classNames("text-link", className)}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}

export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={classNames("page-container", className)}>{children}</div>;
}
