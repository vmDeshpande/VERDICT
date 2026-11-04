import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Hero } from "@/components/landing/Hero";

describe("Hero", () => {
  it("renders the hero heading", () => {
    render(<Hero />);
    expect(
      screen.getByRole("heading", { name: /every argument deserves a hearing/i })
    ).toBeInTheDocument();
  });

  it("renders the CTA button", () => {
    render(<Hero />);
    expect(
      screen.getByRole("link", { name: /start a courtroom/i })
    ).toBeInTheDocument();
  });
});