import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "@/app/page";

describe("Home page", () => {
  it("renders the hero section", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /every argument deserves a hearing/i })
    ).toBeInTheDocument();
  });

  it("renders features section", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /a courtroom, rebuilt for the modern era/i })
    ).toBeInTheDocument();
  });

  it("renders jurisdictions section", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /jurisdiction-aware legal research/i })
    ).toBeInTheDocument();
  });

  it("renders case types section", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /configurable courtroom templates/i })
    ).toBeInTheDocument();
  });

  it("renders AI judge section", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /an interactive ai judge/i })
    ).toBeInTheDocument();
  });
});