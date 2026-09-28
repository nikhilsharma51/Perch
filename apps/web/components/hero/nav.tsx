import { useState,useEffect } from "react";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-[100] transition-colors duration-200 ${
        scrolled ? "border-b border-border bg-surface" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-[1200px] px-6 md:px-16">
        <div className="flex h-16 items-center justify-between">
          <a
            href="#"
            className="font-display text-[22px] tracking-[-0.01em] text-ink no-underline"
          >
            Perch<span className="text-signal">.</span>
          </a>
          <ul className="hidden items-center gap-8 md:flex">
            <li>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-text-secondary transition-colors hover:text-ink"
              >
                How it works
              </a>
            </li>
            <li>
              <a
                href="#for-your-space"
                className="text-sm font-medium text-text-secondary transition-colors hover:text-ink"
              >
                Spaces
              </a>
            </li>
            <li>
              <a
                href="#pricing"
                className="text-sm font-medium text-text-secondary transition-colors hover:text-ink"
              >
                Pricing
              </a>
            </li>
          </ul>
          <div className="flex items-center gap-3">
            <a
              href="#"
              id="nav-login"
              className="text-sm font-medium text-text-secondary transition-colors hover:text-ink"
            >
              Log in
            </a>
            <a
              href="#"
              id="nav-signup"
              className="inline-flex items-center justify-center gap-2 rounded-sharp border border-ink bg-ink px-5 py-2.5 text-sm font-medium leading-none text-paper transition-colors hover:bg-[#2e2d2a] active:bg-[#3d3c39]"
            >
              Sign up
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}