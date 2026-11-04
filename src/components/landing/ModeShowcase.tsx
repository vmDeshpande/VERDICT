import { Card, CardContent } from "@/components/ui/card";
import { Users, MessageSquare, Video, FileText, Scale, BookOpen } from "lucide-react";

const modes = [
  {
    icon: Users,
    title: "Human vs Human",
    description:
      "Two advocates face off in a live, synchronized hearing with real-time transcript updates.",
  },
  {
    icon: MessageSquare,
    title: "Objections & Rulings",
    description:
      "Raise objections, request clarifications, and receive structured rulings from the AI judge.",
  },
  {
    icon: Video,
    title: "Spectator Mode",
    description:
      "Observers and instructors can watch live trials, review transcripts, and provide feedback.",
  },
  {
    icon: FileText,
    title: "Exhibit Management",
    description:
      "Upload permitted documents, track admitted and disputed evidence, and reference exhibits in arguments.",
  },
  {
    icon: Scale,
    title: "Configurable Phases",
    description:
      "Trials progress through opening, submissions, evidence, questioning, closing, and deliberation.",
  },
  {
    icon: BookOpen,
    title: "Trial Replay",
    description:
      "Replay any completed trial from its persisted, auditable event history.",
  },
];

export function ModeShowcase() {
  return (
    <section id="mode-showcase" className="section-padding border-b border-border bg-muted/30">
      <div className="container-default">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for real-time advocacy
          </h2>
          <p className="mt-4 text-muted-foreground">
            Every action is synchronized, auditable, and replayable. The
            courtroom state lives on the server.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {modes.map((mode) => (
            <Card key={mode.title} className="h-full">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                  <mode.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">
                  {mode.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {mode.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}