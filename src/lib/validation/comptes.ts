import { z } from "zod";
import { ROLES } from "@/lib/roles";

export const schemaInvitation = z.object({
  nom: z.string().trim().min(2, "Indiquez le prénom et le nom."),
  email: z.string().trim().toLowerCase().pipe(z.email("Adresse email invalide.")),
  role: z.enum(ROLES, "Choisissez un rôle."),
});

export const schemaRole = z.enum(ROLES);
