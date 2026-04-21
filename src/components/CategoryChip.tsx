import { Link } from "react-router-dom";

export function CategoryChip({ category }: { category: string }) {
  const params = new URLSearchParams({ cats: category, type: "both" });
  return (
    <Link
      to={`/explore?${params.toString()}`}
      className="inline-flex items-center rounded-full border border-primary/40 bg-background px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary transition-colors hover:border-primary hover:bg-primary/10"
    >
      {category}
    </Link>
  );
}
