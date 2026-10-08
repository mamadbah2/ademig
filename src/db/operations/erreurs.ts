// Refus attendu (règle métier), affiché tel quel à l'utilisateur.
export class ErreurMetier extends Error {
  constructor(
    message: string,
    readonly champ?: string,
  ) {
    super(message);
    this.name = "ErreurMetier";
  }
}
