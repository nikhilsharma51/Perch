
export function Footer() {
  return (
    <footer className="border-t border-border bg-paper py-12">
      <div className="mx-auto max-w-[1200px] px-6 md:px-16">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <a href="#" className="font-display text-lg text-ink no-underline">
            Perch<span className="text-signal">.</span>
          </a>
          <ul className="flex list-none gap-6">
            <li>
              <a
                href="#"
                className="text-[13px] text-text-muted no-underline transition-colors hover:text-ink"
              >
                Privacy
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-[13px] text-text-muted no-underline transition-colors hover:text-ink"
              >
                Terms
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-[13px] text-text-muted no-underline transition-colors hover:text-ink"
              >
                Status
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-[13px] text-text-muted no-underline transition-colors hover:text-ink"
              >
                Contact
              </a>
            </li>
          </ul>
          <p className="text-[13px] text-text-muted">
            © 2026 Perch. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}