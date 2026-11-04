import { Button } from "@/components/ui/button";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

describe("Button", () => {
  it("renders with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("applies variant class", () => {
    const { container } = render(<Button variant="outline">Outline</Button>);
    expect(container.querySelector("button")?.className).toContain("border");
  });
});