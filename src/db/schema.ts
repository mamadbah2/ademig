import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
// Chemin relatif : drizzle-kit ne résout pas l'alias `@/`.
import type { Contact, Etape, Liens, Realisation, Reseau, Source, Video } from "../lib/content/types";

const horodatage = () => ({
  creeLe: timestamp("cree_le", { withTimezone: true }).defaultNow().notNull(),
  majLe: timestamp("maj_le", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/* ---------- Better Auth (noms imposés par la bibliothèque) ---------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  role: text("role").default("editeur").notNull(),
  actif: boolean("actif").default(true).notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* ---------- Contenus ---------- */

export const statutPublication = pgEnum("statut_publication", ["brouillon", "publie"]);
export const categoriePartenaire = pgEnum("categorie_partenaire", ["Institution", "Entreprise", "Événement"]);

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull().unique(),
  // Chemin dans Vercel Blob ; vide pour les fichiers servis depuis `/public`.
  pathname: text("pathname"),
  alt: text("alt").notNull(),
  credit: text("credit"),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  mime: text("mime").notNull(),
  taille: integer("taille"),
  creePar: text("cree_par").references(() => user.id, { onDelete: "set null" }),
  ...horodatage(),
});

export const actualites = pgTable("actualites", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  titre: text("titre").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  resume: text("resume").notNull(),
  corps: text("corps").notNull(),
  sources: jsonb("sources").$type<Source[]>().default([]).notNull(),
  videos: jsonb("videos").$type<Video[]>().default([]).notNull(),
  statut: statutPublication("statut").default("brouillon").notNull(),
  publieLe: timestamp("publie_le", { withTimezone: true }),
  ...horodatage(),
});

export const actualitePhotos = pgTable(
  "actualite_photos",
  {
    actualiteId: uuid("actualite_id")
      .notNull()
      .references(() => actualites.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    ordre: integer("ordre").notNull(),
  },
  (t) => [primaryKey({ columns: [t.actualiteId, t.mediaId] })],
);

export const evenements = pgTable("evenements", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  titre: text("titre").notNull(),
  debut: timestamp("debut", { withTimezone: true }).notNull(),
  fin: timestamp("fin", { withTimezone: true }),
  lieuNom: text("lieu_nom").notNull(),
  lieuVille: text("lieu_ville").notNull(),
  theme: text("theme"),
  resume: text("resume").notNull(),
  corps: text("corps").notNull(),
  videos: jsonb("videos").$type<Video[]>().default([]).notNull(),
  afficheId: uuid("affiche_id").references(() => media.id, { onDelete: "set null" }),
  // Noms libres : certains partenaires d'un événement ne figurent pas dans la table `partenaires`.
  partenaires: text("partenaires").array().default(sql`'{}'::text[]`).notNull(),
  statut: statutPublication("statut").default("brouillon").notNull(),
  publieLe: timestamp("publie_le", { withTimezone: true }),
  ...horodatage(),
});

export const evenementPhotos = pgTable(
  "evenement_photos",
  {
    evenementId: uuid("evenement_id")
      .notNull()
      .references(() => evenements.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    ordre: integer("ordre").notNull(),
  },
  (t) => [primaryKey({ columns: [t.evenementId, t.mediaId] })],
);

export const membres = pgTable("membres", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nom: text("nom").notNull(),
  titre: text("titre").notNull(),
  specialite: text("specialite").notNull(),
  promotion: integer("promotion"),
  numero: integer("numero"),
  organisation: text("organisation"),
  ville: text("ville"),
  resume: text("resume").notNull(),
  bio: text("bio"),
  parcours: jsonb("parcours").$type<Etape[]>().default([]).notNull(),
  competences: text("competences").array().default(sql`'{}'::text[]`).notNull(),
  realisations: jsonb("realisations").$type<Realisation[]>().default([]).notNull(),
  liens: jsonb("liens").$type<Liens>(),
  photoId: uuid("photo_id").references(() => media.id, { onDelete: "set null" }),
  visible: boolean("visible").default(true).notNull(),
  ...horodatage(),
});

export const mandats = pgTable(
  "mandats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    libelle: text("libelle").notNull(),
    dateElection: date("date_election", { mode: "string" }).notNull(),
    actif: boolean("actif").default(false).notNull(),
    ...horodatage(),
  },
  // Un seul mandat actif à la fois.
  (t) => [uniqueIndex("mandats_un_seul_actif").on(t.actif).where(sql`${t.actif} = true`)],
);

export const postesBureau = pgTable(
  "postes_bureau",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandatId: uuid("mandat_id")
      .notNull()
      .references(() => mandats.id, { onDelete: "cascade" }),
    membreId: uuid("membre_id")
      .notNull()
      .references(() => membres.id, { onDelete: "cascade" }),
    fonction: text("fonction").notNull(),
    ordre: integer("ordre").notNull(),
    // Membre du bureau exécutif, affiché en tête de la page Bureau.
    executif: boolean("executif").default(false).notNull(),
  },
  (t) => [uniqueIndex("postes_bureau_mandat_membre").on(t.mandatId, t.membreId)],
);

export const commissions = pgTable("commissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  mandatId: uuid("mandat_id")
    .notNull()
    .references(() => mandats.id, { onDelete: "cascade" }),
  nom: text("nom").notNull(),
  mission: text("mission").notNull(),
  ordre: integer("ordre").notNull(),
  ...horodatage(),
});

export const commissionMembres = pgTable(
  "commission_membres",
  {
    commissionId: uuid("commission_id")
      .notNull()
      .references(() => commissions.id, { onDelete: "cascade" }),
    membreId: uuid("membre_id")
      .notNull()
      .references(() => membres.id, { onDelete: "cascade" }),
    ordre: integer("ordre").notNull(),
  },
  (t) => [primaryKey({ columns: [t.commissionId, t.membreId] })],
);

export const partenaires = pgTable("partenaires", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: text("nom").notNull().unique(),
  description: text("description").notNull(),
  categorie: categoriePartenaire("categorie").notNull(),
  url: text("url"),
  logoId: uuid("logo_id").references(() => media.id, { onDelete: "set null" }),
  ordre: integer("ordre").notNull(),
  visible: boolean("visible").default(true).notNull(),
  ...horodatage(),
});

// Une seule ligne (id = 1).
export const reglages = pgTable("reglages", {
  id: integer("id").primaryKey().default(1),
  contact: jsonb("contact").$type<Contact>().notNull(),
  reseaux: jsonb("reseaux").$type<Reseau[]>().default([]).notNull(),
  textes: jsonb("textes").$type<Record<string, string>>().default({}).notNull(),
  majLe: timestamp("maj_le", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/* ---------- Relations (requêtes `db.query.*` avec `with`) ---------- */

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));
export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const actualitesRelations = relations(actualites, ({ many }) => ({
  photos: many(actualitePhotos),
}));
export const actualitePhotosRelations = relations(actualitePhotos, ({ one }) => ({
  actualite: one(actualites, { fields: [actualitePhotos.actualiteId], references: [actualites.id] }),
  media: one(media, { fields: [actualitePhotos.mediaId], references: [media.id] }),
}));

export const evenementsRelations = relations(evenements, ({ one, many }) => ({
  photos: many(evenementPhotos),
  affiche: one(media, { fields: [evenements.afficheId], references: [media.id] }),
}));
export const evenementPhotosRelations = relations(evenementPhotos, ({ one }) => ({
  evenement: one(evenements, { fields: [evenementPhotos.evenementId], references: [evenements.id] }),
  media: one(media, { fields: [evenementPhotos.mediaId], references: [media.id] }),
}));

export const membresRelations = relations(membres, ({ one, many }) => ({
  photo: one(media, { fields: [membres.photoId], references: [media.id] }),
  postes: many(postesBureau),
}));

export const mandatsRelations = relations(mandats, ({ many }) => ({
  postes: many(postesBureau),
  commissions: many(commissions),
}));
export const postesBureauRelations = relations(postesBureau, ({ one }) => ({
  mandat: one(mandats, { fields: [postesBureau.mandatId], references: [mandats.id] }),
  membre: one(membres, { fields: [postesBureau.membreId], references: [membres.id] }),
}));
export const commissionsRelations = relations(commissions, ({ one, many }) => ({
  mandat: one(mandats, { fields: [commissions.mandatId], references: [mandats.id] }),
  membres: many(commissionMembres),
}));
export const commissionMembresRelations = relations(commissionMembres, ({ one }) => ({
  commission: one(commissions, { fields: [commissionMembres.commissionId], references: [commissions.id] }),
  membre: one(membres, { fields: [commissionMembres.membreId], references: [membres.id] }),
}));

export const partenairesRelations = relations(partenaires, ({ one }) => ({
  logo: one(media, { fields: [partenaires.logoId], references: [media.id] }),
}));
