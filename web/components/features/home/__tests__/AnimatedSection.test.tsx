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

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("AnimatedSection", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    intersectionCallback = null;
  });

  it("starts hidden, then transitions in when scrolled into view", () => {
    render(
      <AnimatedSection>
        <div>Content</div>
      </AnimatedSection>
    );

    const wrapper = screen.getByText("Content").parentElement;
    expect(wrapper).toHaveClass("opacity-0", "translate-y-10");

    act(() => {
      intersectionCallback?.([{ isIntersecting: true }]);
    });
    expect(wrapper).toHaveClass("opacity-100");
    expect(wrapper).not.toHaveClass("opacity-0");
  });

  it("stays revealed after scrolling away by default (once)", () => {
    render(
      <AnimatedSection>
        <div>Content</div>
      </AnimatedSection>
    );

    const wrapper = screen.getByText("Content").parentElement;
    act(() => {
      intersectionCallback?.([{ isIntersecting: true }]);
    });
    act(() => {
      intersectionCallback?.([{ isIntersecting: false }]);
    });
    expect(wrapper).toHaveClass("opacity-100");
  });

  it("can hide again when once is false", () => {
    render(
      <AnimatedSection once={false}>
        <div>Repeat</div>
      </AnimatedSection>
    );

    const wrapper = screen.getByText("Repeat").parentElement;
    act(() => {
      intersectionCallback?.([{ isIntersecting: true }]);
    });
    expect(wrapper).toHaveClass("opacity-100");

    act(() => {
      intersectionCallback?.([{ isIntersecting: false }]);
    });
    expect(wrapper).toHaveClass("opacity-0");
  });

  it("uses the hidden pose for the requested animation", () => {
    render(
      <AnimatedSection animation="slide-right">
        <div>Slide</div>
      </AnimatedSection>
    );

    const wrapper = screen.getByText("Slide").parentElement;
    expect(wrapper).toHaveClass("translate-x-12");
  });

  it("starts rise-up content well below its slot", () => {
    render(
      <AnimatedSection animation="rise-up">
        <div>Rise</div>
      </AnimatedSection>
    );

    const wrapper = screen.getByText("Rise").parentElement;
    expect(wrapper).toHaveClass("opacity-0", "translate-y-24");
  });

  it("applies the reveal delay as a transition delay", () => {
    render(
      <AnimatedSection delay={0.2}>
        <div>Delayed</div>
      </AnimatedSection>
    );

    const wrapper = screen.getByText("Delayed").parentElement;
    expect(wrapper?.style.transitionDelay).toBe("0.2s");
  });

  it("shows content immediately when reduced motion is preferred", () => {
    mockMatchMedia(true);

    render(
      <AnimatedSection>
        <div>Reduced</div>
      </AnimatedSection>
    );

    const wrapper = screen.getByText("Reduced").parentElement;
    expect(wrapper).toHaveClass("opacity-100");
  });
});
