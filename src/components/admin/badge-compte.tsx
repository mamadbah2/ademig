import type { SuiviInvitation } from "@/db/operations/invitations";
import { Badge } from "./ui";

const jourMois = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Africa/Dakar" });

// Statut du compte d'un membre : invitation à envoyer, en file, envoyée, en échec ou compte activé.
export function BadgeCompte({ suivi }: { suivi: SuiviInvitation }) {
  switch (suivi.statut) {
    case "a_inviter":
      return <Badge ton="gris">À inviter</Badge>;
    case "en_file":
      return <Badge ton="neutre">En file</Badge>;
    case "invite":
      return <Badge ton="eau">{suivi.le ? `Invité le ${jourMois(suivi.le)}` : "Invité"}</Badge>;
    case "echec":
      return (
        <Badge ton="rouge" title={suivi.erreur ?? undefined}>
          Échec
        </Badge>
      );
    case "active":
      return <Badge ton="vert">Activé</Badge>;
  }
}

export const LIBELLES_FILTRE_COMPTE = {
  a_inviter: "À inviter",
  en_file: "En file",
  invite: "Invités",
  active: "Activés",
  echec: "En échec",
} as const;
