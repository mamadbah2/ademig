import { expect, it } from "vitest";
import { hacherJeton, nouveauJeton } from "./jetons";

it("le hash correspond au jeton et le jeton est imprévisible", () => {
  const a = nouveauJeton();
  const b = nouveauJeton();
  expect(a.jeton).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(a.jeton).not.toBe(b.jeton);
  expect(hacherJeton(a.jeton)).toBe(a.hash);
  expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
});
