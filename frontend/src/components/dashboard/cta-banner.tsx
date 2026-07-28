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
    <div className="relative overflow-hidden rounded-2xl neo p-6 sm:p-8">
      <div className="festive-bar absolute inset-x-0 top-0 rounded-none" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-balloon-pink/20 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 left-10 size-36 rounded-full bg-balloon-sky/20 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-20 bottom-0 size-28 rounded-full bg-balloon-sun/25 blur-2xl"
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-lg">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="balloon-dot bg-balloon-pink" />
            <span className="balloon-dot bg-balloon-sky" />
            <span className="balloon-dot bg-balloon-sun" />
            <span className="balloon-dot bg-balloon-mint" />
          </div>
          <h3 className="font-display text-2xl text-foreground">{title}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-2 rounded-2xl neo-pink px-5 py-2.5 text-sm font-semibold neo-press"
        >
          {cta}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
