CREATE TABLE "emails_file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destinataire" text NOT NULL,
	"sujet" text NOT NULL,
	"html" text NOT NULL,
	"type" text NOT NULL,
	"user_id" text,
	"statut" text DEFAULT 'a_envoyer' NOT NULL,
	"tentatives" integer DEFAULT 0 NOT NULL,
	"erreur" text,
	"envoye_le" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"jeton_hash" text NOT NULL,
	"expire_le" timestamp with time zone NOT NULL,
	"utilisee_le" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_jeton_hash_unique" UNIQUE("jeton_hash")
);
--> statement-breakpoint
ALTER TABLE "membres" ADD COLUMN "annuaire" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "membres" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "membres" ADD COLUMN "email_contact" text;--> statement-breakpoint
ALTER TABLE "membres" ADD COLUMN "telephone" text;--> statement-breakpoint
ALTER TABLE "membres" ADD COLUMN "active_le" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "membres" ADD COLUMN "numero_membre" integer;--> statement-breakpoint
ALTER TABLE "emails_file" ADD CONSTRAINT "emails_file_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "emails_file_statut" ON "emails_file" USING btree ("statut","cree_le");--> statement-breakpoint
CREATE INDEX "invitations_user" ON "invitations" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "membres" ADD CONSTRAINT "membres_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membres" ADD CONSTRAINT "membres_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "membres" ADD CONSTRAINT "membres_numero_membre_unique" UNIQUE("numero_membre");