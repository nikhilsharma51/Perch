import Stripe from 'stripe'

// Singleton pattern: reuse the same Stripe instance across the app
// Stripe client is thread-safe and should be reused
const globalForStripe = globalThis as unknown as { stripe: Stripe }

export const stripe =
  globalForStripe.stripe ||
  new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
  })

// In development, store the instance globally to prevent recreation on hot-reload
if (process.env.NODE_ENV !== 'production') {
  globalForStripe.stripe = stripe
}
