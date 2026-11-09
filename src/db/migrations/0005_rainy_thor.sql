CREATE TABLE "alumni" (
	"numero" integer PRIMARY KEY NOT NULL,
	"prenom" text NOT NULL,
	"nom" text NOT NULL,
	"promotion" integer NOT NULL,
	"promotion_ordre" text NOT NULL,
	"structure" text,
	"poste" text,
	"domaines" text[] DEFAULT '{}'::text[] NOT NULL,
	"decede" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL
);
