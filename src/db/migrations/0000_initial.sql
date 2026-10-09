CREATE TYPE "public"."categorie_partenaire" AS ENUM('Institution', 'Entreprise', 'Événement');--> statement-breakpoint
CREATE TYPE "public"."statut_publication" AS ENUM('brouillon', 'publie');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "actualite_photos" (
	"actualite_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"ordre" integer NOT NULL,
	CONSTRAINT "actualite_photos_actualite_id_media_id_pk" PRIMARY KEY("actualite_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "actualites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"titre" text NOT NULL,
	"date" date NOT NULL,
	"resume" text NOT NULL,
	"corps" text NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"videos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"statut" "statut_publication" DEFAULT 'brouillon' NOT NULL,
	"publie_le" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "actualites_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "commission_membres" (
	"commission_id" uuid NOT NULL,
	"membre_id" uuid NOT NULL,
	"ordre" integer NOT NULL,
	CONSTRAINT "commission_membres_commission_id_membre_id_pk" PRIMARY KEY("commission_id","membre_id")
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandat_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"mission" text NOT NULL,
	"ordre" integer NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evenement_photos" (
	"evenement_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"ordre" integer NOT NULL,
	CONSTRAINT "evenement_photos_evenement_id_media_id_pk" PRIMARY KEY("evenement_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "evenements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"titre" text NOT NULL,
	"debut" timestamp with time zone NOT NULL,
	"fin" timestamp with time zone,
	"lieu_nom" text NOT NULL,
	"lieu_ville" text NOT NULL,
	"theme" text,
	"resume" text NOT NULL,
	"corps" text NOT NULL,
	"videos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"affiche_id" uuid,
	"partenaires" text[] DEFAULT '{}'::text[] NOT NULL,
	"statut" "statut_publication" DEFAULT 'brouillon' NOT NULL,
	"publie_le" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evenements_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "mandats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"libelle" text NOT NULL,
	"date_election" date NOT NULL,
	"actif" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"pathname" text,
	"alt" text NOT NULL,
	"credit" text,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"mime" text NOT NULL,
	"taille" integer,
	"cree_par" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "membres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"nom" text NOT NULL,
	"titre" text NOT NULL,
	"specialite" text NOT NULL,
	"promotion" integer,
	"numero" integer,
	"organisation" text,
	"ville" text,
	"resume" text NOT NULL,
	"bio" text,
	"parcours" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"competences" text[] DEFAULT '{}'::text[] NOT NULL,
	"realisations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"liens" jsonb,
	"photo_id" uuid,
	"visible" boolean DEFAULT true NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membres_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "partenaires" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"description" text NOT NULL,
	"categorie" "categorie_partenaire" NOT NULL,
	"url" text,
	"logo_id" uuid,
	"ordre" integer NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partenaires_nom_unique" UNIQUE("nom")
);
--> statement-breakpoint
CREATE TABLE "postes_bureau" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandat_id" uuid NOT NULL,
	"membre_id" uuid NOT NULL,
	"fonction" text NOT NULL,
	"ordre" integer NOT NULL,
	"executif" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reglages" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"contact" jsonb NOT NULL,
	"reseaux" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"textes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'editeur' NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actualite_photos" ADD CONSTRAINT "actualite_photos_actualite_id_actualites_id_fk" FOREIGN KEY ("actualite_id") REFERENCES "public"."actualites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actualite_photos" ADD CONSTRAINT "actualite_photos_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_membres" ADD CONSTRAINT "commission_membres_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_membres" ADD CONSTRAINT "commission_membres_membre_id_membres_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_mandat_id_mandats_id_fk" FOREIGN KEY ("mandat_id") REFERENCES "public"."mandats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evenement_photos" ADD CONSTRAINT "evenement_photos_evenement_id_evenements_id_fk" FOREIGN KEY ("evenement_id") REFERENCES "public"."evenements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evenement_photos" ADD CONSTRAINT "evenement_photos_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evenements" ADD CONSTRAINT "evenements_affiche_id_media_id_fk" FOREIGN KEY ("affiche_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_cree_par_user_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membres" ADD CONSTRAINT "membres_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partenaires" ADD CONSTRAINT "partenaires_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postes_bureau" ADD CONSTRAINT "postes_bureau_mandat_id_mandats_id_fk" FOREIGN KEY ("mandat_id") REFERENCES "public"."mandats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postes_bureau" ADD CONSTRAINT "postes_bureau_membre_id_membres_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mandats_un_seul_actif" ON "mandats" USING btree ("actif") WHERE "mandats"."actif" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "postes_bureau_mandat_membre" ON "postes_bureau" USING btree ("mandat_id","membre_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");