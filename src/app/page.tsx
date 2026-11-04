import {
  Hero,
  Introduction,
  Features,
  Jurisdictions,
  CaseTypes,
  ModeShowcase,
  AIFeature,
  CTA,
  Footer,
} from "@/components/landing";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Hero />
      <Introduction />
      <Features />
      <Jurisdictions />
      <CaseTypes />
      <ModeShowcase />
      <AIFeature />
      <CTA />
      <Footer />
    </div>
  );
}