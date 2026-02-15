interface SectionHeadingProps {
  children: React.ReactNode;
  sub?: string;
  className?: string;
}

export default function SectionHeading({
  children,
  sub,
  className = "",
}: SectionHeadingProps) {
  return (
    <div className={`mb-12 text-center ${className}`}>
      <h2 className="text-3xl font-bold text-heading sm:text-4xl">{children}</h2>
      {sub && <p className="mt-4 text-lg text-body">{sub}</p>}
    </div>
  );
}
