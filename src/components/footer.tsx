export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t">
      <div className="container mx-auto px-4 py-6">
        <p className="text-sm text-muted-foreground text-center">
          &copy; {currentYear}{" "}
          <a
            href="https://github.com/eric0324"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Falcon
          </a>
          . All rights reserved.
        </p>
      </div>
    </footer>
  );
}
