import { z } from "zod";
import { ROLES_ADMIN } from "@/lib/roles";

export const schemaInvitation = z.object({
  nom: z.string().trim().min(2, "Indiquez le prénom et le nom."),
  email: z.string().trim().toLowerCase().pipe(z.email("Adresse email invalide.")),
  role: z.enum(ROLES_ADMIN, "Choisissez un rôle."),
});

export const schemaRole = z.enum(ROLES_ADMIN);
