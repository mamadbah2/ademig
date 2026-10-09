import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { Resultat } from "@/lib/admin/resultat";

const focus = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-moutarde";

const variantes = {
  principal: "bg-brun text-papier hover:bg-encre",
  secondaire: "border-[1.5px] border-encre bg-papier hover:bg-sable",
  danger: "border-[1.5px] border-rouge bg-papier text-encre hover:bg-rouge hover:text-papier",
};

export function Bouton({
  variante = "principal",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: keyof typeof variantes }) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focus} ${variantes[variante]} ${className}`}
    />
  );
}

function MessagesChamp({ id, aide, erreurs }: { id: string; aide?: string; erreurs?: string[] }) {
  return (
    <>
      {aide && (
        <p id={`${id}-aide`} className="mt-1 text-sm">
          {aide}
        </p>
      )}
      {erreurs && erreurs.length > 0 && (
        <p id={`${id}-erreur`} className="mt-1 border-l-4 border-rouge pl-2 text-sm font-bold">
          {erreurs.join(" ")}
        </p>
      )}
    </>
  );
}

function decritPar(id: string, aide?: string, erreurs?: string[]) {
  const ids = [aide && `${id}-aide`, erreurs?.length && `${id}-erreur`].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

const styleSaisie = `mt-1 block min-h-11 w-full border-[1.5px] border-encre bg-white px-3 py-2 aria-invalid:border-rouge ${focus}`;

export function Champ({
  label,
  name,
  aide,
  erreurs,
  className = "",
  ...props
}: ComponentProps<"input"> & { label: string; name: string; aide?: string; erreurs?: string[] }) {
  const id = props.id ?? `champ-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block font-bold">
        {label}
      </label>
      <input
        {...props}
        id={id}
        name={name}
        aria-invalid={erreurs && erreurs.length > 0 ? true : undefined}
        aria-describedby={decritPar(id, aide, erreurs)}
        className={styleSaisie}
      />
      <MessagesChamp id={id} aide={aide} erreurs={erreurs} />
    </div>
  );
}

export function Selection({
  label,
  name,
  options,
  aide,
  erreurs,
  className = "",
  ...props
}: ComponentProps<"select"> & {
  label: string;
  name: string;
  options: { valeur: string; libelle: string }[];
  aide?: string;
  erreurs?: string[];
}) {
  const id = props.id ?? `champ-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block font-bold">
        {label}
      </label>
      <select
        {...props}
        id={id}
        name={name}
        aria-invalid={erreurs && erreurs.length > 0 ? true : undefined}
        aria-describedby={decritPar(id, aide, erreurs)}
        className={styleSaisie}
      >
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.libelle}
          </option>
        ))}
      </select>
      <MessagesChamp id={id} aide={aide} erreurs={erreurs} />
    </div>
  );
}

// Message de retour d'une action ; annoncé aux lecteurs d'écran.
export function Alerte({ resultat }: { resultat: Pick<Resultat, "ok" | "message"> | null }) {
  if (!resultat?.message) return null;
  return (
    <p
      role={resultat.ok ? "status" : "alert"}
      className={`border-l-4 px-4 py-3 font-bold ${resultat.ok ? "border-vert bg-vert/15" : "border-rouge bg-rouge/10"}`}
    >
      {resultat.message}
    </p>
  );
}

const tonsBadge = { vert: "bg-vert/25", rouge: "bg-rouge/20", moutarde: "bg-moutarde/40", neutre: "bg-sable" };

export function Badge({ ton = "neutre", children }: { ton?: keyof typeof tonsBadge; children: ReactNode }) {
  return <span className={`inline-block px-2 py-0.5 text-sm font-bold ${tonsBadge[ton]}`}>{children}</span>;
}

export function TitrePage({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <h1 className="font-titre text-3xl sm:text-4xl">{children}</h1>
      {action}
    </div>
  );
}

export function EtatVide({ children }: { children: ReactNode }) {
  return <p className="border-[1.5px] border-dashed border-encre px-6 py-10 text-center text-lg">{children}</p>;
}

export function AccesRefusePage() {
  return (
    <>
      <TitrePage>Accès refusé</TitrePage>
      <p className="max-w-xl text-lg">
        Cette rubrique est réservée aux super-admins.{" "}
        <Link href="/admin" className="font-bold underline underline-offset-4">
          Revenir au tableau de bord
        </Link>
      </p>
    </>
  );
}
