export function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Renter picks a slot",
      desc: "Your studio's public page shows a live calendar. Open slots are visible in real time — if someone books one while a renter is looking, it disappears instantly.",
      snippet: "Room A · 11:00–11:30 · ₹400 deposit",
    },
    {
      n: "2",
      title: "Slot is held instantly",
      desc: "The moment a renter taps a slot, Perch locks it with a distributed Redis lock. No one else can book the same time. The lock releases if payment isn't completed within 8 seconds.",
      snippet: "⏱ Slot held · completing payment…",
    },
    {
      n: "3",
      title: "Payment confirms it",
      desc: "A small deposit locks the booking. Stripe handles the payment — the booking flips to confirmed only when Perch receives a webhook from Stripe, never on the renter's word.",
      snippet: "✓ Payment confirmed · Booking #8841 active",
    },
    {
      n: "4",
      title: "You get notified",
      desc: "The booking appears instantly on your dashboard. A reminder fires automatically before the session. Staff check the renter in with one tap — and no-shows are flagged automatically.",
      snippet: "📋 New booking · Sam A. · 11:00 AM today",
    },
  ];

  return (
    <section className="py-16 md:py-24" id="how-it-works">
      <div className="mx-auto max-w-[1200px] px-6 md:px-16">
        <div className="mb-16">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
            How it works
          </p>
          <h2 className="mb-4 font-display text-[28px] leading-9 tracking-[-0.01em] text-ink md:text-[40px] md:leading-[48px]">
            From slot to session in four steps.
          </h2>
          <p className="max-w-[560px] text-[17px] leading-[26px] text-text-secondary">
            A real sequence, not a vague feature list. This is exactly what
            happens the moment a renter taps a slot on your studio&rsquo;s
            page.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-sharp border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div className="bg-surface px-7 py-8" key={step.n}>
              <div className="mb-4 font-display text-4xl leading-none text-ink opacity-15">
                {step.n}
              </div>
              <div className="mb-2 text-[15px] font-semibold text-ink">
                {step.title}
              </div>
              <p className="text-sm leading-[21px] text-text-secondary">
                {step.desc}
              </p>
              <div className="mt-5 rounded-sharp border border-border bg-paper p-3 text-xs text-text-secondary">
                {step.snippet}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}