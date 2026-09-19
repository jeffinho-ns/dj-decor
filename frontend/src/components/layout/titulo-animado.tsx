"use client";

/**
 * Título do cabeçalho com entrada suave a cada troca de tela.
 * Fica fora do <main> para o header não "piscar" junto com o conteúdo.
 */
export function TituloAnimado({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div key={title} className="page-title-enter min-w-0 flex-1">
      <div className="mb-1 flex items-center gap-1.5 md:hidden">
        <span className="balloon-dot bg-balloon-pink" />
        <span className="balloon-dot bg-balloon-sky" />
        <span className="balloon-dot bg-balloon-sun" />
        <p className="ml-1 font-display text-xs font-semibold text-balloon-pink">
          DJ festas
        </p>
      </div>
      <h1 className="truncate font-display text-xl tracking-tight text-foreground sm:text-2xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-0.5 line-clamp-2 hidden text-sm text-muted-foreground sm:block">
          {description}
        </p>
      ) : null}
    </div>
  );
}
