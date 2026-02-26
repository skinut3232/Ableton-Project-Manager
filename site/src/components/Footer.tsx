import Container from "./ui/Container";
import SetCrateLogo from "./SetCrateLogo";

export default function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <Container>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <SetCrateLogo variant="full" height={32} tagline />

          {/* Social icons placeholder */}
          <div className="flex gap-4">
            {["Twitter", "Instagram", "YouTube"].map((platform) => (
              <span
                key={platform}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-xs text-muted transition-colors hover:border-accent hover:text-accent"
                role="link"
                aria-label={`SetCrate on ${platform}`}
                title={platform}
              >
                {platform[0]}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 text-sm text-muted sm:flex-row sm:justify-between">
          <div className="flex flex-wrap justify-center gap-4">
            <a href="/privacy" className="transition-colors hover:text-body">
              Privacy Policy
            </a>
            <a href="/terms" className="transition-colors hover:text-body">
              Terms of Service
            </a>
            <a href="/refund" className="transition-colors hover:text-body">
              Refund Policy
            </a>
            <a
              href="mailto:support@setcrate.app"
              className="transition-colors hover:text-body"
            >
              support@setcrate.app
            </a>
          </div>
          <p>&copy; {new Date().getFullYear()} SetCrate. Made by a producer, for producers.</p>
        </div>
      </Container>
    </footer>
  );
}
