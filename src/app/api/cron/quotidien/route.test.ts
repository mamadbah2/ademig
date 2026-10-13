import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/emails", () => ({ envoyerEmail: vi.fn() }));
vi.mock("@/db/operations/emails-file", () => ({
  viderFile: vi.fn().mockResolvedValue({ envoyes: 2, echecs: 0, restants: 5 }),
}));

import { viderFile } from "@/db/operations/emails-file";
import { GET } from "./route";

const requete = (autorisation?: string) =>
  new Request("http://localhost/api/cron/quotidien", { headers: autorisation ? { authorization: autorisation } : {} });

describe("cron quotidien", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "secret-de-test");
    vi.mocked(viderFile).mockClear();
  });

  it("refuse sans en-tête", async () => {
    expect((await GET(requete())).status).toBe(401);
    expect(viderFile).not.toHaveBeenCalled();
  });

  it("refuse un mauvais secret", async () => {
    expect((await GET(requete("Bearer autre"))).status).toBe(401);
    expect(viderFile).not.toHaveBeenCalled();
  });

  it("refuse tout si CRON_SECRET n'est pas défini", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(requete("Bearer "))).status).toBe(401);
  });

  it("vide la file avec le bon secret", async () => {
    const reponse = await GET(requete("Bearer secret-de-test"));
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ emails: { envoyes: 2, echecs: 0, restants: 5 } });
    expect(viderFile).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ max: 150, pauseMs: 1000 }));
  });
});
