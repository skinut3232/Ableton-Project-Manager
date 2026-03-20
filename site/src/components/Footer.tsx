import Container from "./ui/Container";

export default function Footer() {
  return (
    <footer className="py-10">
      <Container>
        <div className="flex flex-col items-center gap-4 text-xs sm:flex-row sm:justify-between">
          <p className="text-muted">
            &copy; {new Date().getFullYear()} SetCrate
          </p>
          <div className="flex flex-wrap justify-center gap-5">
            <a href="/privacy" className="text-tertiary transition-colors duration-200 hover:text-body">
              Privacy Policy
            </a>
            <a href="/terms" className="text-tertiary transition-colors duration-200 hover:text-body">
              Terms of Service
            </a>
            <a href="/refund" className="text-tertiary transition-colors duration-200 hover:text-body">
              Refund Policy
            </a>
            <a
              href="mailto:support@setcrate.app"
              className="text-tertiary transition-colors duration-200 hover:text-body"
            >
              support@setcrate.app
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
