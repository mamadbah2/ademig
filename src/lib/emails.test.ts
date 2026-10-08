import { describe, expect, it } from "vitest";
import { contenuEmailMotDePasse } from "./emails";

const url = "https://www.ademig.sn/api/auth/reset-password/abc?callbackURL=%2Fadmin%2Freinitialiser";

describe("contenuEmailMotDePasse", () => {
  it("rédige l'invitation", () => {
    const { sujet, html } = contenuEmailMotDePasse({ nom: "Awa", url, invitation: true });
    expect(sujet).toBe("Votre accès à l'administration du site ADEMIG");
    expect(html).toContain("Définir mon mot de passe");
    expect(html).toContain(url.replace(/&/g, "&amp;"));
    expect(html).toContain("24 heures");
  });

  it("rédige la réinitialisation", () => {
    const { sujet, html } = contenuEmailMotDePasse({ nom: "Awa", url, invitation: false });
    expect(sujet).toBe("Réinitialisation de votre mot de passe ADEMIG");
    expect(html).toContain("Choisir un nouveau mot de passe");
  });

  it("échappe le nom du destinataire", () => {
    const { html } = contenuEmailMotDePasse({ nom: "<b>Awa</b>", url, invitation: true });
    expect(html).toContain("&lt;b&gt;Awa&lt;/b&gt;");
    expect(html).not.toContain("<b>Awa</b>");
  });
});
