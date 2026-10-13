import { afterEach, describe, expect, it, vi } from "vitest";

const nodemailer = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({});
  return { sendMail, createTransport: vi.fn(() => ({ sendMail })) };
});
vi.mock("nodemailer", () => ({ default: nodemailer }));

import { envoyerEmail } from "./emails";

describe("transport Gmail", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("borne la connexion, l'accueil et le silence du serveur SMTP", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GMAIL_USER", "expediteur@exemple.test");
    vi.stubEnv("GMAIL_APP_PASSWORD", "mot-de-passe-d-application");
    await envoyerEmail({ a: "destinataire@exemple.test", sujet: "s", html: "<p>h</p>" });
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 }),
    );
    expect(nodemailer.sendMail).toHaveBeenCalledTimes(1);
  });
});
