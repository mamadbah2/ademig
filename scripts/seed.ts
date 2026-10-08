import { db } from "@/db";
import { seed } from "@/db/seed";

seed(db)
  .then(() => {
    console.log("Seed terminé : le contenu initial est en base.");
    process.exit(0);
  })
  .catch((erreur) => {
    console.error(erreur);
    process.exit(1);
  });
