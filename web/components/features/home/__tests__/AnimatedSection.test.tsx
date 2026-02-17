/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { AnimatedSection } from "../AnimatedSection";

type IntersectionCallback = (
  entries: Array<Pick<IntersectionObserverEntry, "isIntersecting">>
) => void;

let intersectionCallback: IntersectionCallback | null = null;

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0];

  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = (entries) => {
      callback(
        entries as IntersectionObserverEntry[],
        this as unknown as IntersectionObserver
      );
    };
  }

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}

describe("AnimatedSection", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    intersectionCallback = null;
  });

  it("stays visible after first reveal by default", () => {
    render(
      <AnimatedSection>
        <div>Content</div>
      </AnimatedSection>
    );

    const wrapper = screen.getByText("Content").parentElement;
    expect(wrapper).toHaveClass("opacity-0");

    act(() => {
      intersectionCallback?.([{ isIntersecting: true }]);
    });
    expect(wrapper).toHaveClass("animate-fade-in-up");

    act(() => {
      intersectionCallback?.([{ isIntersecting: false }]);
    });
    expect(wrapper).toHaveClass("animate-fade-in-up");
    expect(wrapper).not.toHaveClass("opacity-0");
  });

  it("can hide again when once is false", () => {
    render(
      <AnimatedSection once={false}>
        <div>Repeat</div>
      </AnimatedSection>
    );

    const wrapper = screen.getByText("Repeat").parentElement;
    expect(wrapper).toHaveClass("opacity-0");

    act(() => {
      intersectionCallback?.([{ isIntersecting: true }]);
    });
    expect(wrapper).toHaveClass("animate-fade-in-up");

    act(() => {
      intersectionCallback?.([{ isIntersecting: false }]);
    });
    expect(wrapper).toHaveClass("opacity-0");
  });
});
