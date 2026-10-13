import { describe, expect, it } from "vitest";
import { schemaProfil } from "./profil";

const base = { resume: "Géologue.", specialite: "Géologie", visibilite: "publique" };
const message = (r: ReturnType<typeof schemaProfil.safeParse>) => (r.success ? null : r.error.issues.map((i) => i.message));

describe("linkedin", () => {
  it.each(["https://www.linkedin.com/in/awa-ndiaye-123/", "https://linkedin.com/in/awa"])("accepte %s", (linkedin) => {
    const r = schemaProfil.safeParse({ ...base, linkedin });
    expect(r.success && r.data.linkedin).toBe(linkedin);
  });

  it.each(["http://www.linkedin.com/in/awa", "https://linkedin.com/company/x", "https://evil.com/in/x", "https://linkedin.com.evil.com/in/x"])(
    "refuse %s",
    (linkedin) => {
      expect(message(schemaProfil.safeParse({ ...base, linkedin }))).toEqual([
        "Collez l'adresse de votre profil LinkedIn (https://www.linkedin.com/in/…).",
      ]);
    },
  );

  it("vide ou absent donne null", () => {
    expect(schemaProfil.parse({ ...base, linkedin: "  " }).linkedin).toBeNull();
    expect(schemaProfil.parse(base).linkedin).toBeNull();
  });
});

describe("resume", () => {
  it("accepte 500 caractères et refuse 501", () => {
    expect(schemaProfil.safeParse({ ...base, resume: "a".repeat(500) }).success).toBe(true);
    expect(message(schemaProfil.safeParse({ ...base, resume: "a".repeat(501) }))).toEqual(["500 caractères au maximum."]);
  });

  it("refuse le HTML mais accepte un « < » isolé", () => {
    expect(message(schemaProfil.safeParse({ ...base, resume: "Bonjour <b>vous</b>" }))).toEqual(["Texte simple uniquement."]);
    expect(message(schemaProfil.safeParse({ ...base, resume: "<script>alert(1)</script>" }))).toEqual(["Texte simple uniquement."]);
    expect(schemaProfil.safeParse({ ...base, resume: "x < 5 et 3 < 4" }).success).toBe(true);
  });

  it("est obligatoire", () => {
    expect(schemaProfil.safeParse({ ...base, resume: "  " }).success).toBe(false);
  });
});

describe("telephone", () => {
  it.each(["+221 77 123 45 67", "771234567"])("accepte %s", (telephone) => {
    expect(schemaProfil.safeParse({ ...base, telephone }).success).toBe(true);
  });
  it.each(["12345", "abc1234567", "1".repeat(21)])("refuse %s", (telephone) => {
    expect(schemaProfil.safeParse({ ...base, telephone }).success).toBe(false);
  });
  it("vide donne null", () => {
    expect(schemaProfil.parse({ ...base, telephone: "" }).telephone).toBeNull();
  });
});

describe("visibilite", () => {
  it("n'accepte que les valeurs connues", () => {
    expect(schemaProfil.safeParse({ ...base, visibilite: "membres" }).success).toBe(true);
    expect(schemaProfil.safeParse({ ...base, visibilite: "tous" }).success).toBe(false);
    expect(schemaProfil.safeParse({ resume: "R", specialite: "S" }).success).toBe(false);
  });
});

describe("promotion", () => {
  it("convertit en entier, vide donne null, refuse le reste", () => {
    expect(schemaProfil.parse({ ...base, promotion: "2008" }).promotion).toBe(2008);
    expect(schemaProfil.parse({ ...base, promotion: "" }).promotion).toBeNull();
    expect(schemaProfil.safeParse({ ...base, promotion: "20x8" }).success).toBe(false);
    expect(schemaProfil.safeParse({ ...base, promotion: "1800" }).success).toBe(false);
  });
});

describe("photo", () => {
  const url = "https://abc123.public.blob.vercel-storage.com/membres/portrait-xYz.webp";
  const photo = { photoUrl: url, photoPathname: "membres/portrait-xYz.webp", photoLargeur: "800", photoHauteur: "800" };

  it("accepte une photo de membre", () => {
    expect(schemaProfil.parse({ ...base, ...photo })).toMatchObject({
      photoUrl: url,
      photoPathname: "membres/portrait-xYz.webp",
      photoLargeur: 800,
      photoHauteur: 800,
    });
  });

  it("sans photo, tout vaut null", () => {
    expect(schemaProfil.parse({ ...base, photoUrl: "", photoPathname: "", photoLargeur: "", photoHauteur: "" })).toMatchObject({
      photoUrl: null,
      photoPathname: null,
      photoLargeur: null,
      photoHauteur: null,
    });
  });

  it("refuse une autre origine, un autre dossier ou un chemin incohérent avec l'adresse", () => {
    expect(schemaProfil.safeParse({ ...base, ...photo, photoUrl: "https://evil.com/membres/a.webp" }).success).toBe(false);
    const autre = "https://abc123.public.blob.vercel-storage.com/medias/logo.webp";
    expect(schemaProfil.safeParse({ ...base, ...photo, photoUrl: autre, photoPathname: "medias/logo.webp" }).success).toBe(false);
    expect(schemaProfil.safeParse({ ...base, ...photo, photoUrl: autre, photoPathname: "membres/portrait-xYz.webp" }).success).toBe(false);
  });

  it("exige les dimensions", () => {
    expect(schemaProfil.safeParse({ ...base, ...photo, photoLargeur: "" }).success).toBe(false);
  });
});
