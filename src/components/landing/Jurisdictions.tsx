import { Card, CardContent } from "@/components/ui/card";
import { Globe, Landmark, FileText } from "lucide-react";

const jurisdictions = [
  {
    icon: Landmark,
    country: "India",
    sources: [
      "Central and state legislation",
      "Constitutional materials",
      "Gazette notifications",
      "Supreme Court judgments",
      "High Court opinions",
    ],
  },
  {
    icon: Globe,
    country: "United States",
    sources: [
      "Federal constitutional and statutory materials",
      "Federal regulations",
      "Federal opinions",
      "State law collections",
      "Supreme Court decisions",
    ],
  },
];

export function Jurisdictions() {
  return (
    <section id="jurisdictions" className="section-padding border-b border-border bg-muted/30">
      <div className="container-default">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Jurisdiction-aware legal research
          </h2>
          <p className="mt-4 text-muted-foreground">
            Law from one jurisdiction is never silently applied to another.
            Every source is tagged with its authority, coverage, and dates.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {jurisdictions.map((jurisdiction) => (
            <Card key={jurisdiction.country} className="h-full">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                  <jurisdiction.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-4 text-xl font-semibold">
                  {jurisdiction.country}
                </h3>
                <ul className="space-y-2">
                  {jurisdiction.sources.map((source) => (
                    <li key={source} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{source}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}