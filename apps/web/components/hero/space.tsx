
export function ForYourSpace() {
  const spaces = [
    {
      type: "Podcast",
      name: "Recording studios",
      desc: "Sound-treated rooms with time-sensitive slots. Perch prevents double-booking chaos and sends reminders before every session.",
      emoji: "🎙️",
    },
    {
      type: "Photography",
      name: "Photography studios",
      desc: "Large spaces with setup and teardown time. Build buffer windows between bookings and let renters self-serve without you managing every DM.",
      emoji: "📷",
    },
    {
      type: "Gaming",
      name: "Gaming cafés",
      desc: "Multiple rigs, multiple simultaneous bookings. Perch tracks every seat independently and lets staff check in customers with a single tap.",
      emoji: "🎮",
    },
  ];

  return (
    <section className="bg-surface py-16 md:py-24" id="for-your-space">
      <div className="mx-auto max-w-[1200px] px-6 md:px-16">
        <div className="mb-16">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Built for your kind of space
          </p>
          <h2 className="mb-4 font-display text-[28px] leading-9 tracking-[-0.01em] text-ink md:text-[40px] md:leading-[48px]">
            One platform, every physical studio.
          </h2>
          <p className="max-w-[560px] text-[17px] leading-[26px] text-text-secondary">
            Not a generic booking SaaS. Perch is built around one problem —
            real, physical spaces that can only be used by one renter at a
            time and cannot be resold once a slot passes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-sharp border border-border bg-border md:grid-cols-3">
          {spaces.map((space) => (
            <div className="bg-surface" key={space.type}>
              <div className="flex h-[180px] w-full items-center justify-center bg-surface-elevated text-4xl md:h-[220px]">
                {space.emoji}
              </div>
              <div className="p-6">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  {space.type}
                </p>
                <h3 className="mb-2 font-display-text text-[22px] leading-7 text-ink">
                  {space.name}
                </h3>
                <p className="text-sm leading-[21px] text-text-secondary">
                  {space.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};