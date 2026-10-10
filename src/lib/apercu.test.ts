import { beforeEach, describe, expect, it, vi } from "vitest";

const draftMode = vi.hoisted(() => vi.fn());
const lireSession = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ draftMode }));
vi.mock("@/lib/session", () => ({ lireSession }));

import { apercuAutorise } from "./apercu";

beforeEach(() => vi.clearAllMocks());

describe("apercuAutorise", () => {
  it("refuse hors Draft Mode, sans lire la session (la page reste statique)", async () => {
    draftMode.mockResolvedValue({ isEnabled: false });
    expect(await apercuAutorise()).toBe(false);
    expect(lireSession).not.toHaveBeenCalled();
  });

  it("refuse un cookie d'aperçu sans session admin", async () => {
    draftMode.mockResolvedValue({ isEnabled: true });
    lireSession.mockResolvedValue(null);
    expect(await apercuAutorise()).toBe(false);
  });

  it("autorise le Draft Mode avec une session admin", async () => {
    draftMode.mockResolvedValue({ isEnabled: true });
    lireSession.mockResolvedValue({ userId: "u1", role: "editeur" });
    expect(await apercuAutorise()).toBe(true);
  });
});
