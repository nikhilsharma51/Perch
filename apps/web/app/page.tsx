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

/* Base classes shared by every slot cell, plus the per-state variant. Kept as
   a lookup so the JSX doesn't turn into an unreadable template-string chain. */
const SLOT_BASE =
  "flex items-center justify-between rounded-object border px-3.5 py-2.5 text-[13px] tabular-nums transition-colors duration-200";

const SLOT_STATE_CLASSES: Record<SlotState, string> = {
  available:
    "cursor-pointer border-border bg-surface text-ink hover:border-ink",
  selected: "border-ink bg-ink text-paper",
  locked:
    "slot-cell-locked-stripes cursor-not-allowed border-border text-text-muted",
  booked:
    "pointer-events-none cursor-not-allowed border-transparent bg-surface-elevated text-text-muted",
  "just-taken": "border-transparent bg-surface-elevated text-text-muted opacity-70",
};

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
    <div className="w-full max-w-full justify-self-start rounded-sharp border border-border bg-surface p-6 shadow-float lg:max-w-[420px] lg:justify-self-end">
      <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
        <span className="text-[13px] font-semibold uppercase tracking-wide text-ink">
          Priya&rsquo;s Podcast Studio
        </span>
        <span className="text-xs tabular-nums text-text-muted">
          Mon, 9 Sep · Room A
        </span>
      </div>

      <div className="mb-2.5 text-xs font-medium text-text-secondary">
        Morning slots
      </div>
      <div className="mb-4 flex flex-col gap-1.5">
        {slots.map((slot, i) => (
          <div
            key={i}
            className={`${SLOT_BASE} ${SLOT_STATE_CLASSES[slot.state]}`}
          >
            <span className="font-medium">
              {slot.time}–{slot.endTime}
            </span>
            {slot.state === "available" && (
              <span className="font-medium">{slot.price}</span>
            )}
            {slot.state === "booked" && (
              <span className="text-[11px] text-text-muted">Booked</span>
            )}
            {slot.state === "locked" && (
              <span className="text-[11px] text-text-muted">
                ⏱ {slot.label}
              </span>
            )}
            {slot.state === "just-taken" && (
              <span className="text-[11px] text-text-muted">{slot.label}</span>
            )}
            {slot.state === "selected" && (
              <span className="font-medium">{slot.price}</span>
            )}
          </div>
        ))}
      </div>

      <button
        className="btn-signal inline-flex w-full items-center justify-center gap-2 rounded-sharp border border-signal bg-signal px-5 py-2.5 text-sm font-medium leading-none text-white transition-colors hover:bg-[#8f2c23] active:bg-[#7a261e]"
        id="demo-book-btn"
      >
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

/* ─── Hero ───────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section
      className="flex min-h-screen flex-col justify-center pt-16"
      style={{
        background:
          "linear-gradient(160deg, #f5f4f0 0%, #f0efe9 40%, #ebe9e2 70%, #f2f0ea 100%)",
      }}
    >
      <div className="mx-auto max-w-[1200px] px-6 md:px-16">
        <div className="grid grid-cols-1 items-center gap-12 py-20 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div className="max-w-full lg:max-w-[520px]">
            <h1 className="mb-6 font-display text-[42px] leading-[50px] tracking-[-0.02em] text-ink lg:text-[60px] lg:leading-[66px]">
              Never double-booked.
            </h1>
            <p className="mb-10 max-w-full text-lg leading-7 text-text-secondary lg:max-w-[400px]">
              Your studio, your hours, your calendar — booked with certainty.
              Perch gives podcast studios, photography rooms, and gaming cafés
              a live booking calendar that locks slots the moment a renter
              picks one.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#"
                id="hero-cta-signup"
                className="inline-flex items-center justify-center gap-2 rounded-sharp border border-ink bg-ink px-7 py-3.5 text-[15px] font-medium leading-none text-paper transition-colors hover:bg-[#2e2d2a] active:bg-[#3d3c39]"
              >
                Start free
              </a>
              <a
                href="#how-it-works"
                id="hero-cta-how"
                className="inline-flex items-center justify-center gap-2 rounded-sharp border border-ink bg-transparent px-7 py-3.5 text-[15px] font-medium leading-none text-ink transition-colors hover:bg-surface-elevated"
              >
                See how it works
              </a>
            </div>
            <p className="mt-4 text-[13px] text-text-muted">
              No credit card required. Free 14-day trial.
            </p>
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
}

/* ─── Problem Section ────────────────────────────────────────────────────────── */
function TheProblem() {
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

/* ─── Pricing ────────────────────────────────────────────────────────────────── */
function CheckDot({ included, featured }: { included: boolean; featured: boolean }) {
  const circleClasses = featured
    ? "bg-white/15 border-white/20"
    : "bg-surface-elevated border-border";
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${circleClasses}`}
    >
      {included && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M2 5l2 2 4-4"
            stroke={featured ? "#f5f5f2" : "#1b1a18"}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

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
    <section className="py-16 md:py-24" id="pricing">
      <div className="mx-auto max-w-[1200px] px-6 md:px-16">
        <div className="mb-16 text-center">
          <p className="mx-auto mb-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Pricing
          </p>
          <h2 className="mb-4 font-display text-[28px] leading-9 tracking-[-0.01em] text-ink md:text-[40px] md:leading-[48px]">
            Simple, transparent pricing.
          </h2>
          <p className="mx-auto max-w-[560px] text-[17px] leading-[26px] text-text-secondary">
            No per-booking fees. No hidden charges. Pay for the platform,
            keep what you earn.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-sharp border border-border bg-border lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              className={`relative px-8 py-9 ${
                tier.featured ? "bg-ink" : "bg-surface"
              }`}
              key={tier.tier}
            >
              <p
                className={`mb-6 text-xs font-semibold uppercase tracking-wide ${
                  tier.featured ? "text-white/50" : "text-text-muted"
                }`}
              >
                {tier.tier}
              </p>
              <div
                className={`mb-1 font-display text-5xl leading-none tabular-nums ${
                  tier.featured ? "text-paper" : "text-ink"
                }`}
              >
                {tier.price}
              </div>
              <p
                className={`mb-8 text-sm ${
                  tier.featured ? "text-white/50" : "text-text-muted"
                }`}
              >
                {tier.period}
              </p>
              <ul className="mb-8 flex flex-col gap-3">
                {tier.features.map((f) => (
                  <li
                    key={f.text}
                    className={`flex items-center gap-2.5 text-sm ${
                      tier.featured ? "text-white/70" : "text-text-secondary"
                    } ${f.included ? "opacity-100" : "opacity-40"}`}
                  >
                    <CheckDot included={f.included} featured={tier.featured} />
                    {f.text}
                  </li>
                ))}
              </ul>
              <div>
                {tier.variant === "signal" ? (
                  <a
                    href="#"
                    id={`pricing-cta-${tier.tier.toLowerCase()}`}
                    className="flex w-full items-center justify-center gap-2 rounded-sharp border border-signal bg-signal px-5 py-2.5 text-sm font-medium leading-none text-white transition-colors hover:bg-[#8f2c23] active:bg-[#7a261e]"
                  >
                    {tier.cta}
                  </a>
                ) : tier.featured ? (
                  <a
                    href="#"
                    id={`pricing-cta-${tier.tier.toLowerCase()}`}
                    className="flex w-full items-center justify-center gap-2 rounded-sharp border border-paper bg-paper px-5 py-2.5 text-sm font-medium leading-none text-ink transition-colors hover:bg-surface-elevated hover:border-surface-elevated"
                  >
                    {tier.cta}
                  </a>
                ) : (
                  <a
                    href="#"
                    id={`pricing-cta-${tier.tier.toLowerCase()}`}
                    className="flex w-full items-center justify-center gap-2 rounded-sharp border border-ink bg-transparent px-5 py-2.5 text-sm font-medium leading-none text-ink transition-colors hover:bg-surface-elevated"
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

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <hr className="border-t border-border" />
        <HowItWorks />
        <ForYourSpace />
        <hr className="border-t border-border" />
        <TheProblem />
        <hr className="border-t border-border" />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}