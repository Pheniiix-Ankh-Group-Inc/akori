import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
})

export const PLANS = {
  reseau: {
    name: "Réseau",
    priceId: process.env.STRIPE_PRICE_RESEAU!,
    amount: 0,
    currency: "cad",
  },
  pionnier: {
    name: "Pionnier",
    priceId: process.env.STRIPE_PRICE_PIONNIER!,
    amount: 1500,
    currency: "cad",
  },
  institution: {
    name: "Institution",
    priceId: process.env.STRIPE_PRICE_INSTITUTION!,
    amount: 9900,
    currency: "cad",
  },
} as const

export type PlanKey = keyof typeof PLANS