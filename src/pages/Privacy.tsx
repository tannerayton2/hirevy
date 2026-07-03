import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";

const sections: { title: string; body: string }[] = [
  { title: "1. Introduction", body: `Aytopus ("we," "us," "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and share your personal information when you use our platform at aytopus.lovable.app. By using Aytopus you agree to the collection and use of information as described in this policy.` },
  { title: "2. Information We Collect", body: `Information you provide directly: name, email address, and username when you create an account; profile information including bio, profile photo, and social media links if you choose to provide them; review content, star ratings, purchase confirmation details, and any evidence files you upload; messages sent through the Platform; feedback and support requests submitted through the app. Information collected automatically: basic usage data including pages visited, features used, and time spent on the Platform; device type and browser information; IP address for security purposes.` },
  { title: "3. How We Use Your Information", body: `To create and manage your account. To display your public profile and reviews on the Platform. To send transactional communications including account verification, password resets, and review notifications. To improve and maintain the Platform. To detect and prevent fraudulent activity and abuse. To respond to your support requests. We do not use your information for advertising purposes and we do not sell your personal data to third parties.` },
  { title: "4. Information We Share", body: `Profile information and reviews you submit are displayed publicly on the Platform. We share data with Supabase, our database and authentication provider, solely for the purpose of operating the Platform. We may disclose information if required by law, court order, or to protect the rights and safety of Aytopus and its users. We do not share your personal information with any other third parties.` },
  { title: "5. Data Retention", body: `We retain your account information for as long as your account is active. Reviews you submit are part of the public record and may be retained even after account deletion to maintain the integrity of the Platform. You may request deletion of your personal profile data by contacting us.` },
  { title: "6. Your Rights", body: `You may access and update your profile information at any time through your account settings. You may request deletion of your account and associated personal data by contacting us through the app. You may opt out of non-essential notifications through your account settings. Note that reviews you have submitted about others are part of the public record and may not be deleted upon request.` },
  { title: "7. Data Security", body: `We use Supabase for secure data storage with industry-standard encryption. Review evidence files are stored in secure cloud storage with restricted access. While we implement reasonable security measures we cannot guarantee absolute security of data transmitted over the internet.` },
  { title: "8. Children's Privacy", body: `Aytopus is not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If we become aware that a minor has created an account we will terminate it and delete associated data promptly.` },
  { title: "9. Cookies", body: `Aytopus uses essential cookies solely for authentication and session management. We do not use advertising cookies, tracking pixels, or sell cookie data to third parties.` },
  { title: "10. California Privacy Rights", body: `If you are a California resident you have the right to know what personal information we collect, request deletion of your personal information, and opt out of the sale of personal information. We do not sell personal information. To exercise your rights contact us through the app.` },
  { title: "11. Changes to This Policy", body: `We may update this Privacy Policy as the Platform evolves. We will notify users of material changes through the in-app notification system. The date at the top of this policy reflects when it was last updated.` },
  { title: "12. Contact", body: `For privacy-related questions or to exercise your rights contact us through the Aytopus app using the Send us a message feature or email us at support@aytopus.com.` },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" aria-label="Home"><Logo /></Link>
          <Link to="/" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
        <h1 className="font-display text-4xl font-medium tracking-tight text-foreground md:text-5xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: May 23, 2026</p>
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
