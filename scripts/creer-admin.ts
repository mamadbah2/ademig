import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { db } from "@/db";
import { creerCompteAvecMotDePasse } from "@/db/operations/comptes";
import { ErreurMetier } from "@/db/operations/erreurs";

// Usage : npm run admin:creer -- --email awa@exemple.sn --nom "Awa Ndiaye"
const { values } = parseArgs({ options: { email: { type: "string" }, nom: { type: "string" } } });

if (!values.email || !values.nom) {
  console.error('Usage : npm run admin:creer -- --email adresse@exemple.sn --nom "Prénom Nom"');
  process.exit(1);
}

const motDePasse = randomBytes(12).toString("base64url");

creerCompteAvecMotDePasse(db, { email: values.email, nom: values.nom, role: "superadmin", motDePasse })
  .then(() => {
    console.log(`Super-admin créé : ${values.email!.trim().toLowerCase()}`);
    console.log(`Mot de passe temporaire : ${motDePasse}`);
    console.log("Connectez-vous sur /admin/connexion puis changez-le dans « Mon compte ».");
    process.exit(0);
  })
  .catch((erreur) => {
    console.error(erreur instanceof ErreurMetier ? erreur.message : erreur);
    process.exit(1);
  });
