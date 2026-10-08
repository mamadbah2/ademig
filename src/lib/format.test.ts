import { describe, expect, it } from "vitest";
import { formatOctets } from "./format";

describe("formatOctets", () => {
  it("affiche des unités françaises", () => {
    expect(formatOctets(512)).toBe("512 o");
    expect(formatOctets(250 * 1024)).toBe("250 Ko");
    expect(formatOctets(1.5 * 1024 * 1024)).toBe("1,5 Mo");
    expect(formatOctets(25 * 1024 * 1024)).toBe("25 Mo");
  });
});
