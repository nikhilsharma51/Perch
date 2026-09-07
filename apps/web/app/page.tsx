"use client";

import { useCallback, useEffect, useState } from "react";

/* ─── Types ──────────────────────────────────────────────────────────────────── */
type SlotState = "available" | "selected" | "locked" | "booked" | "just-taken";

interface Slot {
  time: string;
  endTime: string;
  price: string;
  state: SlotState;
  label?: string;
}

const INITIAL_SLOTS: Slot[] = [
  { time: "10:00", endTime: "10:30", price: "₹400", state: "booked" },
  { time: "10:30", endTime: "11:00", price: "₹400", state: "available" },
  { time: "11:00", endTime: "11:30", price: "₹400", state: "available" },
  { time: "11:30", endTime: "12:00", price: "₹400", state: "available" },
  { time: "12:00", endTime: "12:30", price: "₹400", state: "available" },
];

/* ─── Inner calendar (remounted to loop) ─────────────────────────────────────── */
function CalendarDemoInner({ onDone }: { onDone: () => void }) {
  const [slots, setSlots] = useState<Slot[]>(
    INITIAL_SLOTS.map((s) => ({ ...s }))
  );

  useEffect(() => {
    type Step = { delay: number; idx: number; state: SlotState; label?: string };
    const steps: Step[] = [
      { delay: 1200, idx: 2, state: "locked", label: "Holding…" },
      { delay: 2800, idx: 2, state: "booked" },
      { delay: 4400, idx: 3, state: "locked", label: "Holding…" },
      { delay: 6000, idx: 3, state: "just-taken", label: "Just booked" },
      { delay: 6800, idx: 3, state: "booked" },
    ];

    const timers = steps.map(({ delay, idx, state, label }) =>
      setTimeout(() => {
        setSlots((prev) =>
          prev.map((s, i) => (i === idx ? { ...s, state, label } : s))
        );
      }, delay)
    );

    // Signal parent to remount after loop completes
    const doneTimer = setTimeout(onDone, 10000);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div className="calendar-demo-card">
      <div className="demo-header">
        <span className="demo-studio-name">Priya&rsquo;s Podcast Studio</span>
        <span className="demo-date tabular">Mon, 9 Sep · Room A</span>
      </div>

      <div className="demo-room-label">Morning slots</div>
      <div className="slot-grid">
        {slots.map((slot, i) => (
          <div
            key={i}
            className={`slot-cell ${slot.state}`}
          >
            <span className="slot-time">
              {slot.time}–{slot.endTime}
            </span>
            {slot.state === "available" && (
              <span className="slot-price">{slot.price}</span>
            )}
            {slot.state === "booked" && (
              <span className="slot-label">Booked</span>
            )}
            {slot.state === "locked" && (
              <span className="slot-clock">⏱ {slot.label}</span>
            )}
            {slot.state === "just-taken" && (
              <span className="slot-label">{slot.label}</span>
            )}
            {slot.state === "selected" && (
              <span className="slot-price">{slot.price}</span>
            )}
          </div>
        ))}
      </div>

      <button className="btn btn-signal demo-cta" id="demo-book-btn">
        Book this slot
      </button>
    </div>
  );
}

/* ─── Calendar Demo wrapper — handles looping ────────────────────────────────── */
function CalendarDemo() {
  const [key, setKey] = useState(0);
  const handleDone = useCallback(() => setKey((k) => k + 1), []);
  return <CalendarDemoInner key={key} onDone={handleDone} />;
}

/* ─── Nav ────────────────────────────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="page-container">
        <div className="nav-inner">
          <a href="#" className="nav-logo">
            Perch<span>.</span>
          </a>
          <ul className="nav-links">
            <li>
              <a href="#how-it-works">How it works</a>
            </li>
            <li>
              <a href="#for-your-space">Spaces</a>
            </li>
            <li>
              <a href="#pricing">Pricing</a>
            </li>
          </ul>
          <div className="nav-actions">
            <a href="#" className="nav-login" id="nav-login">
              Log in
            </a>
            <a href="#" className="btn btn-primary" id="nav-signup">
              Sign up
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero ───────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="hero">
      <div className="page-container">
        <div className="hero-inner">
          <div className="hero-text">
            <h1 className="hero-headline">
              Never double-booked.
            </h1>
            <p className="hero-sub">
              Your studio, your hours, your calendar — booked with certainty.
              Perch gives podcast studios, photography rooms, and gaming cafés a
              live booking calendar that locks slots the moment a renter picks
              one.
            </p>
            <div className="hero-ctas">
              <a href="#" className="btn btn-primary btn-lg" id="hero-cta-signup">
                Start free
              </a>
              <a
                href="#how-it-works"
                className="btn btn-secondary btn-lg"
                id="hero-cta-how"
              >
                See how it works
              </a>
            </div>
            <p className="hero-note">No credit card required. Free 14-day trial.</p>
          </div>

          <CalendarDemo />
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ───────────────────────────────────────────────────────────── */
function HowItWorks() {
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
    <section className="section" id="how-it-works">
      <div className="page-container">
        <div className="section-header">
          <p className="section-label">How it works</p>
          <h2 className="section-headline">
            From slot to session in four steps.
          </h2>
          <p className="section-sub">
            A real sequence, not a vague feature list. This is exactly what
            happens the moment a renter taps a slot on your studio&rsquo;s page.
          </p>
        </div>

        <div className="steps-grid">
          {steps.map((step) => (
            <div className="step" key={step.n}>
              <div className="step-number">{step.n}</div>
              <div className="step-title">{step.title}</div>
              <p className="step-desc">{step.desc}</p>
              <div className="step-snippet">{step.snippet}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Space Types ────────────────────────────────────────────────────────────── */
function ForYourSpace() {
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
    <section
      className="section"
      id="for-your-space"
      style={{ background: "var(--surface)" }}
    >
      <div className="page-container">
        <div className="section-header">
          <p className="section-label">Built for your kind of space</p>
          <h2 className="section-headline">
            One platform, every physical studio.
          </h2>
          <p className="section-sub">
            Not a generic booking SaaS. Perch is built around one problem —
            real, physical spaces that can only be used by one renter at a time
            and cannot be resold once a slot passes.
          </p>
        </div>

        <div className="spaces-grid">
          {spaces.map((space) => (
            <div className="space-card" key={space.type}>
              <div className="space-photo-placeholder">{space.emoji}</div>
              <div className="space-info">
                <p className="space-type">{space.type}</p>
                <h3 className="space-name">{space.name}</h3>
                <p className="space-desc">{space.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Problem Section ────────────────────────────────────────────────────────── */
function TheProblem() {
  const problems = [
    {
      icon: "📅",
      title: "Double-bookings on a shared calendar",
      desc: "Two people get a \"yes\" for the same 6 PM slot. You find out when both show up.",
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
    <section className="section">
      <div className="page-container">
        <div className="problem-grid">
          <div>
            <p className="section-label">The problem it replaces</p>
            <h2 className="section-headline" style={{ marginBottom: 40 }}>
              The shared-calendar era is over.
            </h2>
            <ul className="problem-list">
              {problems.map((p) => (
                <li className="problem-item" key={p.title}>
                  <div className="problem-icon">{p.icon}</div>
                  <div>
                    <div className="problem-title">{p.title}</div>
                    <p className="problem-desc">{p.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="solution-callout">
            <p className="solution-callout-label">What Perch does instead</p>
            <h3 className="solution-callout-headline">
              Every slot is a guaranteed, paid commitment.
            </h3>
            <p className="solution-callout-body">
              Perch uses a distributed slot lock — the moment a renter picks a
              time, no one else can book it. A deposit is required to confirm.
              Cancellations respect the policy you set. No-shows are flagged
              automatically. Every status change is logged with a full audit
              trail.
            </p>
            <div className="stat-row">
              <div className="stat">
                <span className="stat-value tabular">0</span>
                <span className="stat-label">double-bookings possible</span>
              </div>
              <div className="stat">
                <span className="stat-value tabular">8s</span>
                <span className="stat-label">slot lock window</span>
              </div>
              <div className="stat">
                <span className="stat-value tabular">100%</span>
                <span className="stat-label">server-enforced rules</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ────────────────────────────────────────────────────────────────── */
function Pricing() {
  const tiers = [
    {
      tier: "Starter",
      price: "₹0",
      period: "forever",
      features: [
        { text: "1 space", included: true },
        { text: "Up to 20 bookings / month", included: true },
        { text: "Live availability calendar", included: true },
        { text: "Email confirmations", included: true },
        { text: "Staff roles", included: false },
        { text: "Stripe payments & refunds", included: false },
        { text: "Custom cancellation policy", included: false },
      ],
      cta: "Get started free",
      variant: "secondary" as const,
      featured: false,
    },
    {
      tier: "Studio",
      price: "₹1,499",
      period: "per month",
      features: [
        { text: "Unlimited spaces", included: true },
        { text: "Unlimited bookings", included: true },
        { text: "Live availability calendar", included: true },
        { text: "Email confirmations & reminders", included: true },
        { text: "Staff roles & check-in view", included: true },
        { text: "Stripe payments & refunds", included: true },
        { text: "Custom cancellation policy", included: true },
      ],
      cta: "Start free trial",
      variant: "signal" as const,
      featured: true,
    },
    {
      tier: "Enterprise",
      price: "Custom",
      period: "talk to us",
      features: [
        { text: "Everything in Studio", included: true },
        { text: "Multiple locations", included: true },
        { text: "Custom subdomain", included: true },
        { text: "Priority support", included: true },
        { text: "SLA guarantee", included: true },
        { text: "Custom integrations", included: true },
        { text: "Dedicated onboarding", included: true },
      ],
      cta: "Contact us",
      variant: "secondary" as const,
      featured: false,
    },
  ];

  return (
    <section className="section" id="pricing">
      <div className="page-container">
        <div className="section-header-centered">
          <p className="section-label">Pricing</p>
          <h2 className="section-headline">Simple, transparent pricing.</h2>
          <p className="section-sub">
            No per-booking fees. No hidden charges. Pay for the platform, keep
            what you earn.
          </p>
        </div>

        <div className="pricing-grid">
          {tiers.map((tier) => (
            <div
              className={`pricing-card${tier.featured ? " featured" : ""}`}
              key={tier.tier}
            >
              <p className="pricing-tier">{tier.tier}</p>
              <div className="pricing-price">{tier.price}</div>
              <p className="pricing-period">{tier.period}</p>
              <ul className="pricing-features">
                {tier.features.map((f) => (
                  <li
                    key={f.text}
                    className={`pricing-feature${f.included ? " included" : ""}`}
                    style={{ opacity: f.included ? 1 : 0.4 }}
                  >
                    {f.text}
                  </li>
                ))}
              </ul>
              <div className="pricing-btn-wrap">
                {tier.variant === "signal" ? (
                  <a
                    href="#"
                    className="btn btn-signal"
                    id={`pricing-cta-${tier.tier.toLowerCase()}`}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    {tier.cta}
                  </a>
                ) : tier.featured ? (
                  <a
                    href="#"
                    className="btn btn-primary"
                    id={`pricing-cta-${tier.tier.toLowerCase()}`}
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      background: "var(--paper)",
                      color: "var(--ink)",
                      borderColor: "var(--paper)",
                    }}
                  >
                    {tier.cta}
                  </a>
                ) : (
                  <a
                    href="#"
                    className="btn btn-secondary"
                    id={`pricing-cta-${tier.tier.toLowerCase()}`}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    {tier.cta}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="footer">
      <div className="page-container">
        <div className="footer-inner">
          <a href="#" className="footer-logo">
            Perch<span>.</span>
          </a>
          <ul className="footer-links">
            <li>
              <a href="#">Privacy</a>
            </li>
            <li>
              <a href="#">Terms</a>
            </li>
            <li>
              <a href="#">Status</a>
            </li>
            <li>
              <a href="#">Contact</a>
            </li>
          </ul>
          <p className="footer-copy">© 2026 Perch. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <hr className="section-divider" />
        <HowItWorks />
        <ForYourSpace />
        <hr className="section-divider" />
        <TheProblem />
        <hr className="section-divider" />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
