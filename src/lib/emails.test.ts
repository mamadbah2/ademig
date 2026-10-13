import { afterEach, describe, expect, it, vi } from "vitest";
import { contenuEmailMotDePasse, contenuInvitationMembre, emailsConfigures, envoyerEmailVerifie, ErreurTransport, estErreurTransport } from "./emails";

const url = "https://www.ademig.sn/api/auth/reset-password/abc?callbackURL=%2Fadmin%2Freinitialiser";

describe("contenuEmailMotDePasse", () => {
  it("rédige l'invitation", () => {
    const { sujet, html } = contenuEmailMotDePasse({ nom: "Awa", url, invitation: true });
    expect(sujet).toBe("Votre accès à l'administration du site ADEMIG");
    expect(html).toContain("Définir mon mot de passe");
    expect(html).toContain(url.replace(/&/g, "&amp;"));
    expect(html).toContain("24 heures");
  });

  it("rédige la réinitialisation d'un membre pour son espace membre", () => {
    const { sujet, html } = contenuEmailMotDePasse({ nom: "Awa", url, invitation: false, espace: "membre" });
    expect(sujet).toBe("Réinitialisation de votre mot de passe ADEMIG");
    expect(html).toContain("votre espace membre ADEMIG");
    expect(html).not.toContain("administration");
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

describe("envoyerEmailVerifie sans clé Resend", () => {
  const p = { a: "awa@ademig.test", ...contenuEmailMotDePasse({ nom: "Awa", url, invitation: true }) };
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("affiche le lien dans le terminal en développement", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "development");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await expect(envoyerEmailVerifie(p)).resolves.toBeUndefined();
    expect(info).toHaveBeenCalledWith(expect.stringContaining(url.replace(/&/g, "&amp;")));
  });

  it.each(["production", "test"])("refuse hors développement (%s) et n'écrit pas le lien", async (env) => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("GMAIL_USER", "");
    vi.stubEnv("GMAIL_APP_PASSWORD", "");
    vi.stubEnv("NODE_ENV", env);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(envoyerEmailVerifie(p)).rejects.toThrow(
      "Envoi d'email impossible : aucun service d'email n'est configuré.",
    );
    for (const spy of [info, log]) {
      expect(spy.mock.calls.flat().join(" ")).not.toContain(url);
    }
  });
});

describe("contenuInvitationMembre", () => {
  const p = { prenomNom: "Awa Ndiaye", url: "https://www.ademig.sn/invitation/abc?x=1&y=2" };

  it("rédige l'invitation avec le lien échappé", () => {
    const { sujet, html } = contenuInvitationMembre(p);
    expect(sujet).toBe("Votre espace membre ADEMIG");
    expect(html).toContain("https://www.ademig.sn/invitation/abc?x=1&amp;y=2");
    expect(html).toContain("Activer mon compte");
    expect(html).toContain("valable 30 jours");
    expect(html).toContain("#16415D");
  });

  it("échappe le nom", () => {
    const { html } = contenuInvitationMembre({ ...p, prenomNom: "<script>alert(1)</script>" });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});

describe("emailsConfigures", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("est vrai hors développement avec Gmail", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("GMAIL_USER", "ademig@gmail.com");
    vi.stubEnv("GMAIL_APP_PASSWORD", "mot-de-passe-test");
    expect(emailsConfigures()).toBe(true);
  });

  it("est vrai hors développement avec la clé et l'expéditeur", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GMAIL_USER", "");
    vi.stubEnv("GMAIL_APP_PASSWORD", "");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_EXPEDITEUR", "ADEMIG <contact@ademig.sn>");
    expect(emailsConfigures()).toBe(true);
  });

  it("est faux en production sans expéditeur", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GMAIL_USER", "");
    vi.stubEnv("GMAIL_APP_PASSWORD", "");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_EXPEDITEUR", "");
    expect(emailsConfigures()).toBe(false);
  });

  it("est faux en production sans clé", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GMAIL_USER", "");
    vi.stubEnv("GMAIL_APP_PASSWORD", "");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_EXPEDITEUR", "ADEMIG <contact@ademig.sn>");
    expect(emailsConfigures()).toBe(false);
  });

  it("est vrai en développement sans clé", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");
    expect(emailsConfigures()).toBe(true);
  });
});

describe("estErreurTransport", () => {
  const avec = (champs: object, message = "x") => Object.assign(new Error(message), champs);
  it("reconnaît une panne du service", () => {
    expect(estErreurTransport(avec({ code: "EAUTH", responseCode: 535 }))).toBe(true);
    expect(estErreurTransport(avec({ code: "ECONNECTION" }))).toBe(true);
    expect(estErreurTransport(avec({ code: "ETIMEDOUT" }))).toBe(true);
    expect(estErreurTransport(avec({ code: "EMESSAGE", responseCode: 421 }))).toBe(true);
    expect(estErreurTransport(avec({ code: "EMESSAGE", responseCode: 550 }, "550-5.4.5 Daily user sending limit exceeded"))).toBe(true);
    expect(estErreurTransport(new ErreurTransport("Aucun service"))).toBe(true);
  });
  it("laisse compter une tentative pour une erreur propre au destinataire", () => {
    expect(estErreurTransport(avec({ code: "EENVELOPE", responseCode: 550 }, "550 5.1.1 adresse inconnue"))).toBe(false);
    expect(estErreurTransport(new Error("SMTP 550"))).toBe(false);
    expect(estErreurTransport("texte")).toBe(false);
  });
});
