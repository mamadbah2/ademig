import { expect, it } from "vitest";
import { depuisVisibilite, versVisibilite } from "./visibilite";

it.each([
  ["publique", { visible: true, annuaire: true }],
  ["membres", { visible: false, annuaire: true }],
  ["masquee", { visible: false, annuaire: false }],
] as const)("%s ⇄ colonnes", (v, cols) => {
  expect(depuisVisibilite(v)).toEqual(cols);
  expect(versVisibilite(cols)).toBe(v);
});

it("une fiche publique hors annuaire reste publique", () => {
  expect(versVisibilite({ visible: true, annuaire: false })).toBe("publique");
});
