interface SplitHeaderProps {
  label?: string;
  headline: string;
  description?: string;
  linkNumber?: string;
  linkText?: string;
  linkHref?: string;
}

export default function SplitHeader({
  label,
  headline,
  description,
  linkNumber,
  linkText,
  linkHref,
}: SplitHeaderProps) {
  return (
    <div className="mb-14 grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-10">
      <div>
        {label && (
          <p className="mb-4 text-xs font-semibold uppercase tracking-[1.5px] text-accent">
            {label}
          </p>
        )}
        <h2 className="text-3xl font-bold leading-[1.1] tracking-[-1.5px] text-heading sm:text-[40px]">
          {headline}
        </h2>
      </div>
      {(description || linkText) && (
        <div className="pt-0 md:pt-2">
          {description && (
            <p className="text-base leading-[1.7] text-body">{description}</p>
          )}
          {linkNumber && linkText && (
            <p className="mt-4 text-[13px] text-body-muted">
              <span className="tabular-nums text-tertiary">{linkNumber}</span>{" "}
              {linkHref ? (
                <a href={linkHref} className="transition-colors hover:text-heading">
                  {linkText} &rarr;
                </a>
              ) : (
                <span>{linkText} &rarr;</span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
