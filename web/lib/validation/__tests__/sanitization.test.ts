import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  sanitizeString,
  sanitizeUrl,
  sanitizeEmail,
  normalizeWhitespace,
  stripHtml,
  containsSqlInjection,
  containsScript,
  sanitizeStringArray,
  sanitizeReviewContent,
  sanitizeFilename,
  sanitizeSearchQuery,
} from "../sanitization";

describe("escapeHtml", () => {
  it("should escape HTML special characters", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;"
    );
  });

  it("should escape ampersands", () => {
    expect(escapeHtml("A & B & C")).toBe("A &amp; B &amp; C");
  });

  it("should escape quotes", () => {
    expect(escapeHtml('"quoted" text')).toBe("&quot;quoted&quot; text");
  });

  it("should handle empty strings", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("should not modify safe strings", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
  });
});

describe("sanitizeString", () => {
  it("should trim and escape input", () => {
    expect(sanitizeString("  <test>  ")).toBe("&lt;test&gt;");
  });

  it("should return empty string for null", () => {
    expect(sanitizeString(null)).toBe("");
  });

  it("should return empty string for undefined", () => {
    expect(sanitizeString(undefined)).toBe("");
  });
});

describe("sanitizeUrl", () => {
  it("should allow valid http URLs", () => {
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
  });

  it("should allow valid https URLs", () => {
    expect(sanitizeUrl("https://example.com/path")).toBe(
      "https://example.com/path"
    );
  });

  it("should reject javascript: URLs", () => {
    expect(sanitizeUrl("javascript:alert('xss')")).toBe(null);
  });

  it("should reject data: URLs", () => {
    expect(sanitizeUrl("data:text/html,<script>alert('xss')</script>")).toBe(
      null
    );
  });

  it("should return null for invalid URLs", () => {
    expect(sanitizeUrl("not a url")).toBe(null);
  });

  it("should return null for empty input", () => {
    expect(sanitizeUrl("")).toBe(null);
  });

  it("should trim whitespace", () => {
    expect(sanitizeUrl("  https://example.com  ")).toBe("https://example.com/");
  });
});

describe("sanitizeEmail", () => {
  it("should lowercase email", () => {
    expect(sanitizeEmail("USER@EXAMPLE.COM")).toBe("user@example.com");
  });

  it("should trim whitespace", () => {
    expect(sanitizeEmail("  user@example.com  ")).toBe("user@example.com");
  });

  it("should handle mixed case", () => {
    expect(sanitizeEmail("User.Name@Example.COM")).toBe("user.name@example.com");
  });
});

describe("normalizeWhitespace", () => {
  it("should normalize Windows line endings", () => {
    expect(normalizeWhitespace("line1\r\nline2")).toBe("line1\nline2");
  });

  it("should normalize old Mac line endings", () => {
    expect(normalizeWhitespace("line1\rline2")).toBe("line1\nline2");
  });

  it("should limit consecutive newlines to 2", () => {
    expect(normalizeWhitespace("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("should trim whitespace", () => {
    expect(normalizeWhitespace("  hello  ")).toBe("hello");
  });
});

describe("stripHtml", () => {
  it("should remove HTML tags", () => {
    expect(stripHtml("<p>Hello <strong>World</strong></p>")).toBe("Hello World");
  });

  it("should handle nested tags", () => {
    expect(stripHtml("<div><span>Text</span></div>")).toBe("Text");
  });

  it("should handle self-closing tags", () => {
    expect(stripHtml("Line 1<br/>Line 2")).toBe("Line 1Line 2");
  });

  it("should handle empty input", () => {
    expect(stripHtml("")).toBe("");
  });
});

describe("containsSqlInjection", () => {
  it("should detect SELECT statements", () => {
    expect(containsSqlInjection("'; SELECT * FROM users; --")).toBe(true);
  });

  it("should detect DROP statements", () => {
    expect(containsSqlInjection("'; DROP TABLE users; --")).toBe(true);
  });

  it("should detect comment patterns", () => {
    expect(containsSqlInjection("test' -- comment")).toBe(true);
  });

  it("should detect OR 1=1 patterns", () => {
    expect(containsSqlInjection("' OR 1=1 --")).toBe(true);
    expect(containsSqlInjection("' OR 1 = 1")).toBe(true);
  });

  it("should not flag safe text", () => {
    expect(containsSqlInjection("This is a normal review")).toBe(false);
  });

  it("should not flag words containing SQL keywords", () => {
    expect(containsSqlInjection("This selection is excellent")).toBe(false);
  });
});

describe("containsScript", () => {
  it("should detect script tags", () => {
    expect(containsScript("<script>alert('xss')</script>")).toBe(true);
  });

  it("should detect JavaScript protocol", () => {
    expect(containsScript("javascript:alert('xss')")).toBe(true);
  });

  it("should detect event handlers", () => {
    expect(containsScript("<img onerror=alert('xss') src=x>")).toBe(true);
  });

  it("should detect iframes", () => {
    expect(containsScript("<iframe src='evil.com'></iframe>")).toBe(true);
  });

  it("should not flag safe text", () => {
    expect(containsScript("This is a normal description")).toBe(false);
  });
});

describe("sanitizeStringArray", () => {
  it("should sanitize all strings in array", () => {
    expect(sanitizeStringArray(["  hello  ", "<test>"])).toEqual([
      "hello",
      "&lt;test&gt;",
    ]);
  });

  it("should filter out empty strings", () => {
    expect(sanitizeStringArray(["hello", "", "  ", "world"])).toEqual([
      "hello",
      "world",
    ]);
  });

  it("should handle empty array", () => {
    expect(sanitizeStringArray([])).toEqual([]);
  });
});

describe("sanitizeReviewContent", () => {
  it("should normalize whitespace and escape HTML", () => {
    expect(sanitizeReviewContent("  <p>Great place!</p>  ")).toBe(
      "&lt;p&gt;Great place!&lt;&#x2F;p&gt;"
    );
  });

  it("should limit consecutive newlines", () => {
    expect(sanitizeReviewContent("Line1\n\n\n\nLine2")).toBe(
      "Line1\n\nLine2"
    );
  });
});

describe("sanitizeFilename", () => {
  it("should remove path traversal", () => {
    expect(sanitizeFilename("../../../etc/passwd")).toBe("passwd");
  });

  it("should remove backslash paths", () => {
    expect(sanitizeFilename("..\\..\\windows\\system32")).toBe("system32");
  });

  it("should remove null bytes", () => {
    expect(sanitizeFilename("file\0.txt")).toBe("file.txt");
  });

  it("should limit length to 255 chars", () => {
    const longName = "a".repeat(300);
    expect(sanitizeFilename(longName).length).toBe(255);
  });

  it("should preserve valid filenames", () => {
    expect(sanitizeFilename("document.pdf")).toBe("document.pdf");
  });
});

describe("sanitizeSearchQuery", () => {
  it("should trim whitespace", () => {
    expect(sanitizeSearchQuery("  coffee shop  ")).toBe("coffee shop");
  });

  it("should remove angle brackets", () => {
    expect(sanitizeSearchQuery("<script>alert('xss')</script>")).toBe("scriptalert('xss')/script");
  });

  it("should limit to 100 characters", () => {
    const longQuery = "a".repeat(150);
    expect(sanitizeSearchQuery(longQuery).length).toBe(100);
  });

  it("should handle empty input", () => {
    expect(sanitizeSearchQuery("")).toBe("");
  });
});
