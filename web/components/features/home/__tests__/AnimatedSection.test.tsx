/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  AnimatedSection,
  __resetEntranceLatchForTests,
} from "../AnimatedSection";

describe("AnimatedSection", () => {
  it("renders children", () => {
    render(
      <AnimatedSection>
        <div>Content</div>
      </AnimatedSection>
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("passes className through", () => {
    render(
      <AnimatedSection className="custom-class">
        <div>Styled</div>
      </AnimatedSection>
    );
    const wrapper = screen.getByText("Styled").parentElement;
    expect(wrapper).toHaveClass("custom-class");
  });

  it("exports __resetEntranceLatchForTests as a no-op", () => {
    expect(() => __resetEntranceLatchForTests()).not.toThrow();
  });
});
