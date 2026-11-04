import Link from "next/link";

const links = [
  { href: "#features", label: "Features" },
  { href: "#jurisdictions", label: "Jurisdictions" },
  { href: "#case-types", label: "Case Types" },
  { href: "#mode-showcase", label: "Courtroom Modes" },
  { href: "#ai-judge", label: "AI Judge" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container-default flex flex-col items-center gap-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <ScaleIcon />
            VERDICT
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-powered courtroom simulation and legal education.
          </p>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="container-default py-6 text-center text-xs text-muted-foreground">
          VERDICT is an educational and simulation product. Its AI-generated
          analysis and simulated decisions are not legally binding, do not
          constitute legal advice, and must not be represented as decisions of
          a real court.
        </div>
      </div>
    </footer>
  );
}

function ScaleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M12 3v18" />
      <path d="M3 12h18" />
      <circle cx="6" cy="6" r="1.5" />
      <circle cx="18" cy="6" r="1.5" />
      <circle cx="6" cy="18" r="1.5" />
      <circle cx="18" cy="18" r="1.5" />
    </svg>
  );
}