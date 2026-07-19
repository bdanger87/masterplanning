import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/pricing")({
  component: Pricing,
});

const tiers = [
  {
    name: "Starter",
    price: "$500",
    period: "/month",
    leads: "Up to 500 leads/mo",
    features: ["Basic dashboard", "Email reports", "Standard support"],
    link: "https://buy.stripe.com/3cIfZhbNzfVKc514Do2Nq01",
  },
  {
    name: "Pro",
    price: "$1,000",
    period: "/month",
    leads: "Up to 2,000 leads/mo",
    features: [
      "Advanced analytics",
      "Priority support",
      "White-label",
    ],
    link: "https://buy.stripe.com/14A4gz3h3bFub0X8TE2Nq02",
    highlighted: true,
  },
  {
    name: "Growth",
    price: "$1,500",
    period: "/month",
    leads: "Unlimited leads",
    features: [
      "Everything in Pro",
      "Dedicated support",
      "Custom integrations",
      "SLA",
    ],
    link: "https://buy.stripe.com/aFa7sLcRDeRG5GD7PA2Nq03",
  },
];

const faqs = [
  {
    q: "How quickly can I start recovering leads?",
    a: "Once you complete onboarding, your AI Lead Recovery OS is live within 5 business days. The self-serve onboarding form captures everything we need to get you started fast.",
  },
  {
    q: "Can I switch plans later?",
    a: "Absolutely. You can upgrade or downgrade your plan at any time. Upgrades take effect immediately; downgrades apply at the end of your current billing cycle.",
  },
  {
    q: "Is there a long-term contract?",
    a: "All plans are annual contracts with quarterly billing. This keeps pricing predictable and lets us invest in your success over the long term.",
  },
  {
    q: "What does the setup fee cover?",
    a: "The one-time $3,500 setup fee covers provisioning your instance, configuring the white-label environment, asset verification, and hands-on activation support to get your first client live.",
  },
  {
    q: "Do you offer white-label for all plans?",
    a: "White-label is included on Pro and Growth plans. The Starter plan uses co-branded LeadLoop dashboards. If white-label is critical, we recommend starting at Pro.",
  },
];

function Pricing() {
  return (
    <main>
      {/* Hero */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            AI Lead Recovery OS
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Scale Your Agency with AI Lead Recovery
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Automate lead follow-up, onboarding, and client management — so you
            can grow from 5 to 20+ accounts without growing your headcount.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-8 shadow-sm transition ${
                tier.highlighted
                  ? "border-indigo-300 ring-2 ring-indigo-500 shadow-md"
                  : "border-gray-200"
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-0.5 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-semibold text-gray-900">{tier.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-gray-900">
                  {tier.price}
                </span>
                <span className="text-gray-500">{tier.period}</span>
              </div>
              <p className="mt-2 text-sm font-medium text-indigo-600">
                {tier.leads}
              </p>
              <ul className="mt-6 flex-1 space-y-2 text-sm text-gray-600">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <svg
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={tier.link}
                target="_blank"
                rel="noopener"
                className={`mt-6 block rounded-lg px-6 py-3 text-center text-sm font-semibold transition ${
                  tier.highlighted
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-gray-900 text-white hover:bg-gray-800"
                }`}
              >
                Get Started
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Setup Fee */}
      <section className="border-t border-gray-200 bg-gray-50 py-16 dark:bg-gray-900">
        <div className="mx-auto max-w-lg px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Setup Fee</h2>
          <p className="mt-2 text-gray-600">
            One-time payment that covers instance provisioning, white-label
            configuration, asset verification, and hands-on activation support.
          </p>
          <div className="mt-4 text-3xl font-bold text-gray-900">$3,500</div>
          <p className="mt-1 text-sm text-gray-500">one-time</p>
          <a
            href="https://buy.stripe.com/dRmbJ12cZdNCd95edY2Nq00"
            target="_blank"
            rel="noopener"
            className="mt-6 inline-block rounded-lg bg-gray-900 px-8 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition"
          >
            Pay Setup Fee
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-2xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-gray-900">
          Frequently Asked Questions
        </h2>
        <div className="mt-8 space-y-6">
          {faqs.map((faq) => (
            <div key={faq.q}>
              <h3 className="font-semibold text-gray-900">{faq.q}</h3>
              <p className="mt-1 text-sm text-gray-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Portal CTA */}
      <section className="border-t border-gray-200 py-12 text-center">
        <p className="text-gray-600">
          Already a client?{" "}
          <Link
            to="/portal"
            className="font-medium text-indigo-600 hover:text-indigo-700 underline"
          >
            Access your portal
          </Link>
        </p>
      </section>
    </main>
  );
}
