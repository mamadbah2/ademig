import { createHash, randomBytes } from "node:crypto";

export function hacherJeton(jeton: string): string {
  return createHash("sha256").update(jeton).digest("hex");
}

// Le jeton en clair ne quitte le serveur que dans l'email ou le lien copié ; la base n'en garde que le hash.
export function nouveauJeton(): { jeton: string; hash: string } {
  const jeton = randomBytes(32).toString("base64url");
  return { jeton, hash: hacherJeton(jeton) };
}
