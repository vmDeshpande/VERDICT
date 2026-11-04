import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Users, Brain, FileText, Scale, Shield } from "lucide-react";

const points = [
  {
    icon: BookOpen,
    title: "Learn legal reasoning",
    description:
      "VERDICT makes practical legal learning more accessible. Instead of only reading cases or asking a chatbot questions, participants enter a structured virtual courtroom.",
  },
  {
    icon: Users,
    title: "Take on roles",
    description:
      "Assign configurable courtroom roles. Support spectators and classroom observers. Preserve a chronological, auditable trial record.",
  },
  {
    icon: Brain,
    title: "Work with an AI judge",
    description:
      "The AI provides procedural facilitation, legal research assistance, structured feedback, and a transparent simulated judicial assessment.",
  },
  {
    icon: FileText,
    title: "Examine a case file",
    description:
      "Support real-case study exercises and fictional hypotheticals. Create case packets with facts, issues, parties, and legal materials.",
  },
  {
    icon: Scale,
    title: "Present and challenge",
    description:
      "Submit arguments, raise objections, submit exhibits, and respond to the AI judge's questions in a structured hearing.",
  },
  {
    icon: Shield,
    title: "Procedural integrity",
    description:
      "Deterministic application logic controls permissions and trial state. Every committed action is auditable and replayable.",
  },
];

export function Introduction() {
  return (
    <section id="how-it-works" className="section-padding border-b border-border bg-muted/30">
      <div className="container-default">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How a trial works
          </h2>
          <p className="mt-4 text-muted-foreground">
            A typical VERDICT hearing follows a configurable lifecycle. The
            exact sequence depends on the courtroom template.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {points.map((point, index) => (
            <Card key={point.title} className="relative h-full">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                    {index + 1}
                  </div>
                  <point.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">
                  {point.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {point.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}