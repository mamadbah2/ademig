import { readFileSync } from "node:fs";
import { db } from "@/db";
import { remplacerAlumni } from "@/db/operations/alumni";
import { listerAlumni } from "@/db/requetes/alumni";
import { analyserFichierAlumni } from "@/lib/alumni/nettoyage";

// Usage : npm run alumni:importer -- chemin/du/fichier.csv
// Le fichier contient des e-mails et des téléphones : il ne doit jamais être commité. Seules les
// colonnes publiques entrent en base. Invalider ensuite le cache : vercel cache invalidate --tag alumni --yes
async function main() {
  const chemin = process.argv[2];
  if (!chemin) throw new Error("Indiquez le chemin du fichier CSV.");
  const lignes = analyserFichierAlumni(readFileSync(chemin, "utf8"));
  await remplacerAlumni(db, lignes);
  const affiches = await listerAlumni(db);
  console.log(`${lignes.length} alumni en base, ${affiches.length} affichés (les autres ont déjà une fiche membre).`);
  process.exit(0);
}

main().catch((erreur) => {
  console.error(erreur);
  process.exit(1);
});
