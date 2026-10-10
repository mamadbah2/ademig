import { describe, expect, it } from "vitest";
import { depuisDateLocale, versDateLocale } from "./dates";

describe("dates des événements (Dakar, UTC+0)", () => {
  it("fait l'aller-retour sans glisser d'une heure", () => {
    const d = depuisDateLocale("2026-09-12T09:00")!;
    expect(d.toISOString()).toBe("2026-09-12T09:00:00.000Z");
    expect(versDateLocale(d)).toBe("2026-09-12T09:00");
  });
  it("accepte les secondes envoyées par le navigateur", () => {
    expect(depuisDateLocale("2026-09-12T09:00:30")!.toISOString()).toBe("2026-09-12T09:00:30.000Z");
    expect(depuisDateLocale("2026-09-12T09:00:00")!.toISOString()).toBe("2026-09-12T09:00:00.000Z");
  });
  it.each(["2026-09-12T09:00:61", "2026-02-30T09:00:00"])("refuse « %s »", (v) => {
    expect(depuisDateLocale(v)).toBeNull();
  });
  it.each(["", "2026-09-12", "12/09/2026 09:00", "2026-13-40T25:00"])("refuse « %s »", (v) => {
    expect(depuisDateLocale(v)).toBeNull();
  });
});
