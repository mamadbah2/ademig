import { describe, expect, it } from "vitest";
import { choisirDiaposHero, DIAPOS_PAR_DEFAUT } from "./hero";
import type { Actualite, Evenement, Photo } from "./types";

const MAINTENANT = new Date("2026-10-13T10:00:00.000Z");
const photo = (nom: string): Photo => ({ src: `/p/${nom}.jpg`, alt: `Photo ${nom}`, width: 1600, height: 1000 });

function actualite(slug: string, date: string, photos: Photo[] = []): Actualite {
  return { slug, titre: `Actu ${slug}`, date, resume: "", corps: "", photos: photos.length ? photos : undefined };
}
function evenement(slug: string, debut: string, o: Partial<Evenement> = {}): Evenement {
  return { slug, titre: `Évén. ${slug}`, debut, lieu: { nom: "UCAD", ville: "Dakar" }, resume: "", corps: "", ...o };
}
const choisir = (actualites: Actualite[], evenements: Evenement[] = []) =>
  choisirDiaposHero({ actualites, evenements, maintenant: MAINTENANT });

describe("choisirDiaposHero", () => {
  it("garde les photos d'origine si rien de récent n'a de photo", () => {
    expect(choisir([])).toEqual(DIAPOS_PAR_DEFAUT);
    expect(choisir([actualite("sans-photo", "2026-10-01")])).toEqual(DIAPOS_PAR_DEFAUT);
    // Trop ancienne : elle ne prend plus le hero.
    expect(choisir([actualite("ancienne", "2026-01-10", [photo("a")])])).toEqual(DIAPOS_PAR_DEFAUT);
  });

  it("prend la plus récente actualité avec photo, au plus trois images, avec un lien vers elle", () => {
    const diapos = choisir([
      actualite("sans-photo", "2026-10-10"),
      actualite("journee", "2026-09-12", [photo("1"), photo("2"), photo("3"), photo("4")]),
      actualite("autre", "2026-09-01", [photo("x")]),
    ]);
    expect(diapos.map((d) => d.src)).toEqual(["/p/1.jpg", "/p/2.jpg", "/p/3.jpg"]);
    expect(diapos.map((d) => d.univers)).toEqual(["Actualité 1", "Actualité 2", "Actualité 3"]);
    expect(diapos[0]).toMatchObject({ alt: "Photo 1", une: { titre: "Actu journee", href: "/actualites/journee" } });
  });

  it("met le prochain événement en premier et alterne avec l'actualité", () => {
    const evenements = [
      evenement("lointain", "2027-03-01T09:00:00.000Z", { photos: [photo("l")] }),
      evenement("prochain", "2026-11-05T09:00:00.000Z", { photos: [photo("e1"), photo("e2")] }),
      evenement("passe", "2026-09-12T09:00:00.000Z", { photos: [photo("p")] }),
    ];
    const diapos = choisir([actualite("journee", "2026-09-12", [photo("a1"), photo("a2")])], evenements);
    expect(diapos.map((d) => d.src)).toEqual(["/p/e1.jpg", "/p/a1.jpg", "/p/e2.jpg"]);
    expect(diapos[0].une).toEqual({ titre: "Évén. prochain", href: "/evenements/prochain" });
    expect(diapos.map((d) => d.univers)).toEqual(["Événement 1", "Actualité", "Événement 2"]);
  });

  it("garde un événement en cours et n'utilise une affiche que si elle est en largeur", () => {
    const enCours = evenement("en-cours", "2026-10-12T09:00:00.000Z", {
      fin: "2026-10-14T18:00:00.000Z",
      affiche: { src: "/p/affiche-large.jpg", alt: "Affiche", width: 1600, height: 900 },
    });
    expect(choisir([], [enCours]).map((d) => d.src)).toEqual(["/p/affiche-large.jpg"]);

    const enHauteur = evenement("bientot", "2026-11-01T09:00:00.000Z", {
      affiche: { src: "/p/affiche.jpg", alt: "Affiche", width: 900, height: 1270 },
    });
    expect(choisir([], [enHauteur])).toEqual(DIAPOS_PAR_DEFAUT);
  });

  it("ne répète pas une image partagée par l'actualité et l'événement", () => {
    const commune = photo("commune");
    const diapos = choisir(
      [actualite("annonce", "2026-10-01", [commune])],
      [evenement("forum", "2026-11-05T09:00:00.000Z", { photos: [commune] })],
    );
    expect(diapos.map((d) => d.src)).toEqual(["/p/commune.jpg"]);
  });
});
