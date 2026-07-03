import { Link } from "react-router-dom";
import { ShieldCheck, Mail, FileCheck2, Lock, Scale } from "lucide-react";
import { usePageMeta } from "@/lib/usePageMeta";

export default function HowVerificationWorks() {
  usePageMeta(
    "How Review Verification Works | Aytopus",
    "Plain-language guide: how email-confirmed public reviews, proof-backed reviews, provider protections, and human-reviewed disputes keep the network honest.",
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:py-14">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/30">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="font-display text-3xl font-bold md:text-4xl">How verification works</h1>
        <p className="mt-3 text-sm text-muted-foreground md:text-base">
          Every review on Aytopus has to earn its place. Here's exactly what happens before a review shows up on a profile — and what happens if someone disputes one.
        </p>
      </div>

      <div className="space-y-6">
        <Section
          icon={<Mail className="h-5 w-5" />}
          title="Public reviews are email-confirmed"
          body="Anyone can submit a review through a provider's public review link, but nothing appears on the profile until the reviewer clicks the confirmation link we send to their email. Unverified submissions are held privately and expire if not confirmed. This blocks anonymous drive-by ratings and makes every visible public review tied to a real, reachable inbox."
        />
        <Section
          icon={<FileCheck2 className="h-5 w-5" />}
          title="Proof-backed reviews require evidence and an account"
          body="Proof-backed reviews are the highest trust tier. The reviewer must be signed in to a Aytopus account and attach evidence of the engagement — a receipt, deliverable, contract, screenshot, or similar. These reviews are labeled distinctly on the profile so buyers can tell them apart from public reviews at a glance."
        />
        <Section
          icon={<Lock className="h-5 w-5" />}
          title="Providers cannot edit or remove reviews"
          body="Once a review is verified, the provider it's about can't edit its text, change its rating, or delete it. Providers can reply publicly, and they can dispute a review they believe violates the rules — but the review itself stays out of their hands. Ratings are owned by the people who wrote them."
        />
        <Section
          icon={<Scale className="h-5 w-5" />}
          title="Disputes are reviewed by a human"
          body="If a provider believes a review is fake, defamatory, or off-topic, they can open a dispute. A Aytopus moderator reviews the submission, the evidence, and any reply thread before deciding. We remove reviews that clearly break the rules, and we leave the rest — negative reviews are not removed just for being negative."
        />
      </div>

      <div className="mt-10 rounded-lg border border-border bg-card/60 p-5 text-sm text-muted-foreground">
        <p className="mb-2 font-semibold text-foreground">The short version</p>
        <p>
          Public reviews prove the reviewer's email is real. Proof-backed reviews prove the work was real. Providers can respond but not silence. And a human — not the provider — decides disputes.
        </p>
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <Link
          to="/explore"
          className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Browse verified providers
        </Link>
      </div>
    </div>
  );
}

function Section({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 md:p-6">
      <div className="mb-2 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
          {icon}
        </span>
        <h2 className="font-display text-lg font-semibold md:text-xl">{title}</h2>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground md:text-[15px]">{body}</p>
    </section>
  );
}
