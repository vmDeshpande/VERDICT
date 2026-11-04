import { Card, CardContent } from "@/components/ui/card";
import { Brain, Scale, BookOpen, Shield, FileText, Users } from "lucide-react";

const aiFeatures = [
  {
    icon: Brain,
    title: "Moderates hearings",
    description:
      "Opens the hearing, tracks the case and current phase, and asks parties to clarify or substantiate arguments.",
  },
  {
    icon: Scale,
    title: "Issues procedural directions",
    description:
      "Requests legal authority, responds to objections according to simulation rules, and proposes phase transitions.",
  },
  {
    icon: BookOpen,
    title: "Citation-grounded decisions",
    description:
      "Produces a reasoned, non-binding simulated decision linked to verified source passages.",
  },
  {
    icon: Shield,
    title: "Safe action pipeline",
    description:
      "The AI proposes typed actions. The backend validates permissions, phase rules, and citations before committing anything.",
  },
  {
    icon: FileText,
    title: "Explainable assessments",
    description:
      "AI outputs identify reasoning, sources, uncertainty, and limitations. Nothing is presented as verified legal advice.",
  },
  {
    icon: Users,
    title: "Human advocacy first",
    description:
      "The AI is a procedural facilitator. Participants control their arguments and decisions.",
  },
];

export function AIFeature() {
  return (
    <section id="ai-judge" className="section-padding border-b border-border">
      <div className="container-default">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            An interactive AI judge
          </h2>
          <p className="mt-4 text-muted-foreground">
            The AI is not the protagonist. Human legal reasoning is. The judge
            provides procedural facilitation, legal research assistance, and
            transparent simulated assessment.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {aiFeatures.map((feature) => (
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