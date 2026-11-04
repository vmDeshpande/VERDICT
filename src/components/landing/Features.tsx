import { Card, CardContent } from "@/components/ui/card";
import { Scale, Users, Brain, BookOpen, Gavel, Shield } from "lucide-react";

const features = [
  {
    icon: Scale,
    title: "Virtual Courtroom",
    description:
      "Create private or public courtrooms, invite participants, and run structured hearings with real-time synchronization.",
  },
  {
    icon: Users,
    title: "Multiplayer Advocacy",
    description:
      "Two or more advocates present arguments, raise objections, submit exhibits, and respond to judicial questions.",
  },
  {
    icon: Brain,
    title: "Interactive AI Judge",
    description:
      "An AI judicial assistant moderates hearings, asks clarifying questions, requests legal authority, and produces a reasoned simulated decision.",
  },
  {
    icon: BookOpen,
    title: "Source-Grounded Law",
    description:
      "Legal claims are traceable to identifiable sources with jurisdiction, dates, citations, and verification status.",
  },
  {
    icon: Gavel,
    title: "Objection Workflow",
    description:
      "Raise objections, request rulings, and track the outcome through a structured, auditable workflow.",
  },
  {
    icon: Shield,
    title: "Procedural Integrity",
    description:
      "Deterministic backend logic governs permissions and trial state. The AI proposes; the backend validates and commits.",
  },
];

export function Features() {
  return (
    <section id="features" className="section-padding border-b border-border">
      <div className="container-default">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            A courtroom, rebuilt for the modern era
          </h2>
          <p className="mt-4 text-muted-foreground">
            Everything you need to practice legal advocacy, from case review
            through simulated judgment.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="h-full">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}