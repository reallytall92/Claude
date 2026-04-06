import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        {/* Logo mark */}
        <div className="flex items-center justify-center size-16 rounded-2xl bg-primary/10 mb-8">
          <FileText className="size-8 text-primary" />
        </div>

        {/* Wordmark */}
        <h1 className="text-3xl font-bold tracking-tight">Portside</h1>
        <p className="mt-2 text-muted-foreground text-lg">
          Generate lease agreements in minutes, not hours.
        </p>

        {/* CTA */}
        <Link
          href="/lease"
          className="mt-10 flex items-center justify-center gap-2 w-full h-14 rounded-2xl bg-primary text-primary-foreground text-base font-medium hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          Start New Lease
          <ArrowRight className="size-5" />
        </Link>

        <p className="mt-6 text-sm text-muted-foreground/60">
          Takes about 3 minutes to complete
        </p>
      </div>
    </div>
  );
}
