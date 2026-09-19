export type BillingCycle = "monthly" | "yearly";
export type PaymentMethod = "card" | "yape" | "transferencia";
export type CardBrand = "visa" | "mastercard" | "amex" | "diners";

export interface PlanDTO {
  id: "free" | "premium" | string;
  name: string;
  tagline: string;
  currency: string;
  price_monthly: number;
  price_yearly: number;
  yearly_savings: number;
  features: string[];
  limits: string[];
}

export interface PaymentDTO {
  id: string;
  company_id: string;
  plan_id: string;
  billing_cycle: BillingCycle;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: "paid" | "failed" | "refunded" | string;
  reference: string;
  card_last4: string | null;
  paid_at: string;
  created_at: string | null;
}

/** Only brand + last4 + holder ever leave the browser. Never the number or CVV. */
export interface CheckoutCardPayload {
  brand: CardBrand;
  last4: string;
  holder_name: string;
}

export interface CheckoutPayload {
  plan_id: "premium";
  billing_cycle: BillingCycle;
  method: PaymentMethod;
  card?: CheckoutCardPayload;
  yape_code?: string;
  billing_ruc?: string;
  billing_name?: string;
}

export interface CheckoutResultDTO {
  payment: PaymentDTO;
  subscription: import("./api").SubscriptionDTO;
}
