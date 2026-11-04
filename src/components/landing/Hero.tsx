import { Button } from "@/components/ui/button";
import { ArrowRight, Scale, Users, BookOpen, Brain } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-background to-muted/30">
      <div className="container-default section-padding flex flex-col items-center text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur">
          <Scale className="h-4 w-4" />
          AI-powered legal education
        </div>

        <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Every argument{" "}
          <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            deserves a hearing
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          VERDICT is an AI-powered courtroom simulation platform where you can
          practice legal advocacy, debate real and fictional cases, and
          participate in interactive hearings moderated by an AI judicial
          assistant.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/auth/register">
              Start a courtroom
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#how-it-works">Learn more</Link>
          </Button>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Multiplayer hearings
          </div>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Interactive AI judge
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Source-grounded law
          </div>
        </div>
      </div>
    </section>
  );
}