import { Button } from "@/components/ui/button";
import { ArrowRight, Scale } from "lucide-react";
import Link from "next/link";

export function CTA() {
  return (
    <section className="section-padding">
      <div className="container-default">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background">
            <Scale className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to practice legal advocacy?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Create a courtroom, invite your opponent, and begin a structured,
            source-grounded hearing moderated by an AI judge.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/auth/register">
                Create a courtroom
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">Explore features</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            VERDICT is an educational and simulation product. AI-generated
            analysis and simulated decisions are not legally binding and must
            not be represented as decisions of a real court.
          </p>
        </div>
      </div>
    </section>
  );
}