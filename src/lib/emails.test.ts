import { afterEach, describe, expect, it, vi } from "vitest";
import { contenuEmailMotDePasse, envoyerEmailMotDePasse } from "./emails";

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

describe("envoyerEmailMotDePasse sans clé Resend", () => {
  const p = { email: "awa@ademig.test", nom: "Awa", url, invitation: true };
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("affiche le lien dans le terminal hors production", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("VERCEL_ENV", "preview");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await expect(envoyerEmailMotDePasse(p)).resolves.toBeUndefined();
    expect(info).toHaveBeenCalledWith(expect.stringContaining(url));
  });

  it("refuse en production et n'écrit pas le lien", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("VERCEL_ENV", "production");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(envoyerEmailMotDePasse(p)).rejects.toThrow(
      "Envoi d'email impossible : RESEND_API_KEY n'est pas configurée.",
    );
    for (const spy of [info, log]) {
      expect(spy.mock.calls.flat().join(" ")).not.toContain(url);
    }
  });
});
