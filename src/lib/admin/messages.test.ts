import { describe, expect, it } from "vitest";
import { messageChangementMotDePasse, messageConnexion } from "./messages";

describe("messageConnexion", () => {
  it("explique un compte désactivé", () => {
    expect(messageConnexion(403)).toBe("Ce compte est désactivé. Contactez un super-admin.");
  });
  it("explique la limite de tentatives", () => {
    expect(messageConnexion(429)).toBe("Trop de tentatives. Patientez une minute puis réessayez.");
  });
  it("reste vague sur les identifiants", () => {
    expect(messageConnexion(401)).toBe("Email ou mot de passe incorrect.");
  });
});

describe("messageChangementMotDePasse", () => {
  it("signale un mot de passe actuel incorrect", () => {
    expect(messageChangementMotDePasse("INVALID_PASSWORD")).toBe("Le mot de passe actuel est incorrect.");
  });
  it("signale un mot de passe trop court", () => {
    expect(messageChangementMotDePasse("PASSWORD_TOO_SHORT")).toBe("Le nouveau mot de passe doit faire au moins 12 caractères.");
  });
  it("a un message par défaut", () => {
    expect(messageChangementMotDePasse(undefined)).toBe("Le mot de passe n'a pas pu être changé. Réessayez.");
  });
});
