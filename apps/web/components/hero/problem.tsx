
export function TheProblem() {
  const problems = [
    {
      icon: "📅",
      title: "Double-bookings on a shared calendar",
      desc: 'Two people get a "yes" for the same 6 PM slot. You find out when both show up.',
    },
    {
      icon: "💸",
      title: "No-shows with no recourse",
      desc: "Renters ghost with no deposit on the line. That slot could have gone to someone else.",
    },
    {
      icon: "📱",
      title: "Booking by DM or WhatsApp",
      desc: "Checking availability manually, confirming over chat, sending payment links separately. It works until it doesn't.",
    },
    {
      icon: "🚫",
      title: "No cancellation policy enforcement",
      desc: "Your policy is in a doc somewhere. Whether it's applied depends on who's on shift that day.",
    },
  ];

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-16">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
              The problem it replaces
            </p>
            <h2 className="mb-10 font-display text-[28px] leading-9 tracking-[-0.01em] text-ink md:text-[40px] md:leading-[48px]">
              The shared-calendar era is over.
            </h2>
            <ul className="flex flex-col gap-6">
              {problems.map((p) => (
                <li className="flex gap-4" key={p.title}>
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sharp border border-border bg-surface-elevated text-base">
                    {p.icon}
                  </div>
                  <div>
                    <div className="mb-1 text-[15px] font-semibold text-ink">
                      {p.title}
                    </div>
                    <p className="text-sm leading-[21px] text-text-secondary">
                      {p.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-sharp border border-border bg-surface p-10">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              What Perch does instead
            </p>
            <h3 className="mb-4 font-display text-[28px] leading-9 text-ink">
              Every slot is a guaranteed, paid commitment.
            </h3>
            <p className="mb-7 text-[15px] leading-6 text-text-secondary">
              Perch uses a distributed slot lock — the moment a renter picks a
              time, no one else can book it. A deposit is required to
              confirm. Cancellations respect the policy you set. No-shows are
              flagged automatically. Every status change is logged with a
              full audit trail.
            </p>
            <div className="flex gap-8 border-t border-border pt-7">
              <div className="flex flex-col gap-1">
                <span className="font-display text-[32px] tabular-nums text-ink">
                  0
                </span>
                <span className="text-[13px] text-text-muted">
                  double-bookings possible
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-display text-[32px] tabular-nums text-ink">
                  8s
                </span>
                <span className="text-[13px] text-text-muted">
                  slot lock window
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-display text-[32px] tabular-nums text-ink">
                  100%
                </span>
                <span className="text-[13px] text-text-muted">
                  server-enforced rules
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}