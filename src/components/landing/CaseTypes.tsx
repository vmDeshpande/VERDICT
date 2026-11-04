import { Card, CardContent } from "@/components/ui/card";
import { FileText, BookOpen, Users, Scale } from "lucide-react";

const caseTypes = [
  {
    icon: Scale,
    title: "Criminal Trial",
    description:
      "Practice criminal procedure: charges, evidence rules, burden of proof, and sentencing considerations.",
  },
  {
    icon: FileText,
    title: "Civil Hearing",
    description:
      "Work through civil disputes, contract claims, torts, and remedies with structured submissions.",
  },
  {
    icon: BookOpen,
    title: "Appellate Argument",
    description:
      "Focus on issues, records, standards of review, and the art of appellate advocacy.",
  },
  {
    icon: Users,
    title: "Moot Court",
    description:
      "Practice written and oral submissions on defined legal issues in a competitive format.",
  },
];

export function CaseTypes() {
  return (
    <section id="case-types" className="section-padding border-b border-border">
      <div className="container-default">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Configurable courtroom templates
          </h2>
          <p className="mt-4 text-muted-foreground">
            Criminal trials, civil hearings, appellate arguments, and moot court
            do not share one universal procedure. Each mode follows its own
            rules.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {caseTypes.map((caseType) => (
            <Card key={caseType.title} className="h-full text-center">
              <CardContent className="p-6">
                <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                  <caseType.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">
                  {caseType.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {caseType.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}