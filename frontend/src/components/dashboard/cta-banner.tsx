import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface CtaBannerProps {
  title: string;
  description: string;
  href: string;
  cta: string;
}

export function CtaBanner({ title, description, href, cta }: CtaBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-champagne/25 bg-gradient-to-br from-champagne/10 via-transparent to-transparent p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-champagne/10 blur-3xl"
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-lg">
          <h3 className="font-display text-2xl text-foreground">{title}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-shadow hover:shadow-[0_0_24px_-4px_rgba(228,197,138,0.5)]"
        >
          {cta}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
