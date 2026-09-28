"use client";

import { useCallback, useEffect, useState } from "react";
import {Nav} from "../components/hero/nav";
import {TheProblem} from "../components/hero/problem";
import {Footer} from "../components/hero/footer";
import { ForYourSpace } from "@/components/hero/space";
import {HowItWorks} from "@/components/hero/howitworks"


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


function CalendarDemo() {
  const [key, setKey] = useState(0);
  const handleDone = useCallback(() => setKey((k) => k + 1), []);
  return <CalendarDemoInner key={key} onDone={handleDone} />;
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