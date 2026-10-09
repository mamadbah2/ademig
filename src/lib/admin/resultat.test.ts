import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ErreurMetier } from "@/db/operations/erreurs";
import { AccesRefuse } from "@/lib/roles";
import { erreursDe, resultatDErreur } from "./resultat";

describe("erreursDe", () => {
  it("rattache les erreurs Zod aux champs", () => {
    const r = z.object({ nom: z.string().min(2, "Indiquez le nom.") }).safeParse({ nom: "" });
    expect(r.success).toBe(false);
    expect(erreursDe(r.error!)).toEqual({
      ok: false,
      message: "Corrigez les champs signalés.",
      erreurs: { nom: ["Indiquez le nom."] },
    });
  });
});

describe("resultatDErreur", () => {
  it("traduit un accès refusé", () => {
    expect(resultatDErreur(new AccesRefuse())).toEqual({ ok: false, message: "Accès refusé." });
  });

  it("traduit une erreur métier, avec son champ", () => {
    expect(resultatDErreur(new ErreurMetier("Email déjà utilisé.", "email"))).toEqual({
      ok: false,
      message: "Email déjà utilisé.",
      erreurs: { email: ["Email déjà utilisé."] },
    });
  });

  it("laisse passer les autres erreurs", () => {
    expect(resultatDErreur(new Error("panne"))).toBeNull();
  });
});
