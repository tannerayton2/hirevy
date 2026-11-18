import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { Logo } from "@/components/Logo";

const sections: { title: string; body: string }[] = [
  { title: "1. Introduction", body: `Aytopus ("we," "us," "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and share personal information when you use aytopus.com, including proof cards. By using Aytopus you agree to the collection and use of information as described in this policy.` },
  { title: "2. Information We Collect", body: `Account information: your email address and password (or your Google sign-in), and the name you choose to show on your proof card. Profile and review information you choose to provide, such as a photo, bio, social links, and reviews. Information collected automatically: basic usage data such as pages visited and features used, device and browser type, and IP address for security purposes.` },
  { title: "3. Connected Payment Data (Proof Cards)", body: `If you create a proof card, you give us a Stripe restricted API key that you create with read-only access to Charges, Disputes, Subscriptions, and Invoices. With that key we read your payment records from roughly the last 15 months: payment amounts and dates, refunds, disputes and their reasons, subscription and payment-plan status, the business name Stripe shows for your account or on customer statements, and, for each payment, Stripe's card fingerprint and the customer's ID or email. Stripe never gives us full card numbers, and the key cannot move money, issue refunds, or change anything in your Stripe account. We use this data only to calculate your proof card: counting unique clients, measuring retention, refund, dispute, and payment-plan rates, and excluding payments that appear to come from you. Card fingerprints and customer emails are used only to tell clients apart and to exclude your own payments; they are never displayed.` },
  { title: "4. What Is Public and What Stays Private", body: `Shown publicly on your card (unless you hide it): your card name and category, score, tier, factor ratings (such as "Excellent" or "Fair"), the headline numbers you choose to display, the business name payments go to as reported by Stripe, your record number, and when the card was last checked. Never shown publicly: your revenue or payment amounts, your clients' names, emails, or any client-level detail, your Stripe key, and the exact figures behind each rating. Your detailed metrics and any flags affecting your score are visible only to you and to Aytopus administrators.` },
  { title: "5. Your Clients' Information", body: `Calculating a proof card involves processing records about the people who paid you. We use that information only in aggregate to produce your score. We do not contact your clients, display them, sell their information, or use it for any other purpose.` },
  { title: "6. How We Use Your Information", body: `To create and manage your account; to calculate, display, and refresh your proof card; to detect fraud and attempts to manipulate scores; to send transactional emails such as account confirmation and password resets; to respond to support requests; and to maintain and improve the Platform. We do not use your information for advertising and we do not sell personal data.` },
  { title: "7. Information We Share", body: `Proof cards you leave public can be viewed by anyone with the link, and link previews (for example in text messages or social apps) show your card's name, tier, score, and chosen numbers. We use service providers to operate the Platform: Supabase (database, authentication, and server functions), Vercel (website hosting), and Stripe (the source of your payment data, accessed with the key you provide). We may disclose information if required by law or to protect the rights and safety of Aytopus and its users. We do not share personal information with anyone else.` },
  { title: "8. Data Security", body: `Your Stripe restricted key is encrypted with AES-256-GCM before it is stored and is never shown again, including to you. Data is stored with Supabase using industry-standard encryption and access controls. No system is perfectly secure, and we cannot guarantee absolute security of data transmitted over the internet.` },
  { title: "9. Data Retention and Your Choices", body: `You can hide your card at any time; hiding is recorded and your score history is kept so that a card cannot be reset to erase a poor record. You can disconnect Stripe at any time from Card settings, or by deleting the restricted key in your Stripe dashboard; your card will then show as paused. Deleting your account permanently deletes your account, your proof card, your stored key, your metrics, and your score history. Reviews you have written about others may be retained as part of the public record.` },
  { title: "10. Children's Privacy", body: `Aytopus is not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If we learn that a minor has created an account we will delete it and its data promptly.` },
  { title: "11. Cookies", body: `Aytopus uses essential cookies and local storage only for sign-in and session management. We do not use advertising cookies or tracking pixels.` },
  { title: "12. California Privacy Rights", body: `If you are a California resident you have the right to know what personal information we collect, to request its deletion, and to opt out of its sale. We do not sell personal information. To exercise your rights, email support@aytopus.com.` },
  { title: "13. Changes to This Policy", body: `We may update this Privacy Policy as the Platform evolves. We will notify users of material changes by email or in the app. The date at the top of this policy shows when it was last updated.` },
  { title: "14. Contact", body: `For privacy questions or to exercise your rights, email support@aytopus.com.` },
];

export default function Privacy() {
  const goBack = useGoBack("/proofcard");
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/proofcard" aria-label="Home"><Logo /></Link>
          <button type="button" onClick={goBack} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
        <h1 className="font-display text-4xl font-medium tracking-tight text-foreground md:text-5xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: November 17, 2026</p>
        <div className="mt-10 space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="font-display text-xl font-semibold text-primary">{s.title}</h2>
              <p className="mt-2 text-[15px] leading-7 text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
