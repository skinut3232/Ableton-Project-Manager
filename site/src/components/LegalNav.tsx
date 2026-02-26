import SetCrateLogo from "./SetCrateLogo";

export default function LegalNav() {
  return (
    <nav className="border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="/" aria-label="SetCrate home">
          <SetCrateLogo variant="full" height={36} />
        </a>
        <a
          href="/"
          className="text-sm text-muted transition-colors hover:text-body"
        >
          &larr; Back to Home
        </a>
      </div>
    </nav>
  );
}
