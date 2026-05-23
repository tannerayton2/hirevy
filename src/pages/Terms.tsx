import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";

const sections: { title: string; body: string }[] = [
  { title: "1. Acceptance of Terms", body: `By accessing or using HireVy ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform. HireVy is operated by Tanner Ayton ("we," "us," "our"). These terms apply to all users including buyers, coaches, service providers, and visitors.` },
  { title: "2. Eligibility", body: `You must be at least 18 years old to create an account or use HireVy. By using the Platform you represent that you meet this requirement and that all information you provide is accurate and complete.` },
  { title: "3. Accounts", body: `You are responsible for maintaining the confidentiality of your account credentials. You may not share your account, impersonate another person, or create accounts for deceptive purposes. Usernames are permanent once set and may not be transferred. We reserve the right to terminate accounts that violate these terms.` },
  { title: "4. User Content and Reviews", body: `By submitting a review you represent that it reflects your honest, firsthand experience. You may not submit reviews that are false, fabricated, paid for, incentivized, defamatory, harassing, or submitted on behalf of another person. You may not submit reviews for businesses or individuals with whom you have no direct experience. By submitting content to HireVy you grant us a perpetual, non-exclusive, royalty-free, worldwide license to display, reproduce, and distribute that content on the Platform.` },
  { title: "5. Prohibited Conduct", body: `You agree not to: submit fake or manipulated reviews; impersonate any person or entity; attempt to manipulate tier rankings or trust scores; scrape, copy, or redistribute HireVy content without permission; use automated tools or bots to interact with the Platform; harass, threaten, or abuse other users; attempt to gain unauthorized access to any account or system; use the Platform for any unlawful purpose.` },
  { title: "6. Profile Claims", body: `Coaches and service providers may claim profiles created on HireVy. Claiming a profile does not entitle you to remove legitimate reviews. HireVy reserves the right to verify identity before approving claims and to reject claims that cannot be adequately verified. Approved claims may be revoked if fraudulent activity is discovered.` },
  { title: "7. Content Removal", body: `HireVy reserves the right to remove any review or content that violates these terms, is determined to be fraudulent, or is otherwise harmful to the integrity of the Platform. We are not obligated to remove content simply because a subject disagrees with it. Removal decisions are at our sole discretion.` },
  { title: "8. Disclaimer of Warranties", body: `HireVy provides review information as a public service. We do not verify every review and cannot guarantee the accuracy, completeness, or reliability of any user-submitted content. The Platform is provided "as is" without warranties of any kind, express or implied. We do not warrant that the Platform will be uninterrupted, error-free, or free of harmful components.` },
  { title: "9. Limitation of Liability", body: `To the fullest extent permitted by law, HireVy and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform or reliance on any content displayed thereon. Our total liability for any claim shall not exceed one hundred dollars ($100).` },
  { title: "10. Indemnification", body: `You agree to indemnify and hold harmless HireVy and its operators from any claims, damages, losses, or expenses including reasonable legal fees arising from your use of the Platform or violation of these terms.` },
  { title: "11. Modifications", body: `We reserve the right to modify these terms at any time. Continued use of the Platform after changes are posted constitutes acceptance of the revised terms. We will notify users of material changes through the in-app notification system.` },
  { title: "12. Governing Law", body: `These terms are governed by the laws of the State of Florida, United States, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Florida.` },
  { title: "13. Contact", body: `For questions about these terms contact us through the HireVy app using the Send us a message feature or email us at support@hirevy.com.` },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" aria-label="Home"><Logo /></Link>
          <Link to="/" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
        <h1 className="font-display text-4xl font-medium tracking-tight text-foreground md:text-5xl">Terms of Service</h1>
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
