"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState } from "react";
import { Bouton } from "../ui";

const PROTOCOLES = /^(https?:\/\/|mailto:)/i;

// Limité aux balises acceptées par nettoyerHtml (src/lib/html.ts) ; le serveur renettoie de toute façon.
const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    link: { openOnClick: false, autolink: true, defaultProtocol: "https", isAllowedUri: (url) => PROTOCOLES.test(url) },
  }),
];

const styleOutil =
  "min-h-11 min-w-11 border-[1.5px] border-encre px-2 font-bold aria-pressed:bg-brun aria-pressed:text-papier disabled:opacity-40 focus-visible:outline-3 focus-visible:outline-moutarde";

export default function ZoneTiptap({
  valeurInitiale,
  onChange,
  idLibelle,
  idDescription,
  invalide,
}: {
  valeurInitiale: string;
  onChange: (html: string) => void;
  idLibelle: string;
  idDescription?: string;
  invalide: boolean;
}) {
  const [lien, setLien] = useState<string | null>(null);
  const [erreurLien, setErreurLien] = useState("");
  const boutonLien = useRef<HTMLButtonElement>(null);
  const editeur = useEditor({
    extensions,
    content: valeurInitiale,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": idLibelle,
        ...(idDescription ? { "aria-describedby": idDescription } : {}),
        ...(invalide ? { "aria-invalid": "true" } : {}),
        class: "texte-long min-h-64 bg-white px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  const etat = useEditorState({
    editor: editeur,
    // L'instantané de useEditorState garde l'éditeur null du premier rendu jusqu'à la première transaction
    // (immediatelyRender: false) : on lit donc l'éditeur courant, sinon la barre ne s'affiche jamais.
    selector: () =>
      editeur && {
        paragraphe: editeur.isActive("paragraph"),
        h2: editeur.isActive("heading", { level: 2 }),
        h3: editeur.isActive("heading", { level: 3 }),
        gras: editeur.isActive("bold"),
        italique: editeur.isActive("italic"),
        puces: editeur.isActive("bulletList"),
        numeros: editeur.isActive("orderedList"),
        citation: editeur.isActive("blockquote"),
        lien: editeur.isActive("link"),
        annuler: editeur.can().undo(),
        retablir: editeur.can().redo(),
      },
  });

  if (!editeur || !etat) return <div className="min-h-64 bg-white" />;
  const chaine = () => editeur.chain().focus();

  const outils = [
    { libelle: "Paragraphe", actif: etat.paragraphe, faire: () => chaine().setParagraph().run() },
    { libelle: "Titre 2", actif: etat.h2, faire: () => chaine().toggleHeading({ level: 2 }).run() },
    { libelle: "Titre 3", actif: etat.h3, faire: () => chaine().toggleHeading({ level: 3 }).run() },
    { libelle: "Gras", actif: etat.gras, faire: () => chaine().toggleBold().run() },
    { libelle: "Italique", actif: etat.italique, faire: () => chaine().toggleItalic().run() },
    { libelle: "Liste à puces", actif: etat.puces, faire: () => chaine().toggleBulletList().run() },
    { libelle: "Liste numérotée", actif: etat.numeros, faire: () => chaine().toggleOrderedList().run() },
    { libelle: "Citation", actif: etat.citation, faire: () => chaine().toggleBlockquote().run() },
  ];

  function fermerLien() {
    setLien(null);
    setErreurLien("");
    boutonLien.current?.focus();
  }

  function appliquerLien() {
    const adresse = (lien ?? "").trim();
    if (adresse === "") {
      chaine().extendMarkRange("link").unsetLink().run();
    } else if (!PROTOCOLES.test(adresse)) {
      setErreurLien("L'adresse doit commencer par https://, http:// ou mailto:.");
      return;
    } else if (editeur!.state.selection.empty && !etat!.lien) {
      // Sans texte sélectionné, l'adresse elle-même devient le texte du lien.
      chaine().insertContent({ type: "text", text: adresse, marks: [{ type: "link", attrs: { href: adresse } }] }).run();
    } else {
      chaine().extendMarkRange("link").setLink({ href: adresse }).run();
    }
    setLien(null);
    setErreurLien("");
  }

  return (
    <div className={`border-[1.5px] ${invalide ? "border-rouge" : "border-encre"}`}>
      <div role="toolbar" aria-label="Mise en forme" className="flex flex-wrap gap-1 border-b-[1.5px] border-encre bg-sable p-2">
        {outils.map((o) => (
          <button key={o.libelle} type="button" aria-pressed={o.actif} onClick={o.faire} className={styleOutil}>
            {o.libelle}
          </button>
        ))}
        <button
          ref={boutonLien}
          type="button"
          aria-pressed={etat.lien}
          aria-expanded={lien !== null}
          onClick={() => setLien(editeur.getAttributes("link").href ?? "")}
          className={styleOutil}
        >
          Lien
        </button>
        <button type="button" disabled={!etat.annuler} onClick={() => chaine().undo().run()} className={styleOutil}>
          Annuler
        </button>
        <button type="button" disabled={!etat.retablir} onClick={() => chaine().redo().run()} className={styleOutil}>
          Rétablir
        </button>
      </div>
      {lien !== null && (
        <div className="flex flex-wrap items-end gap-2 border-b-[1.5px] border-encre p-3">
          <label className="min-w-0 flex-1 font-bold">
            Adresse du lien
            <input
              type="text"
              inputMode="url"
              value={lien}
              onChange={(e) => {
                setLien(e.target.value);
                setErreurLien("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  fermerLien();
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  appliquerLien();
                }
              }}
              className="mt-1 block min-h-11 w-full border-[1.5px] border-encre bg-white px-3 font-normal"
              autoFocus
            />
          </label>
          <Bouton type="button" onClick={appliquerLien}>
            Appliquer
          </Bouton>
          <Bouton type="button" variante="secondaire" onClick={fermerLien}>
            Fermer
          </Bouton>
          {erreurLien && (
            <p role="alert" className="w-full border-l-4 border-rouge pl-2 text-sm font-bold">
              {erreurLien}
            </p>
          )}
        </div>
      )}
      <EditorContent editor={editeur} />
    </div>
  );
}
