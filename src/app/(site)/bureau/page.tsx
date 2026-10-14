import type { Metadata } from "next";
import { IconeCarre, ordreTons, type IconeName } from "@/components/illustration";
import { CarteMembre } from "@/components/carte-membre";
import { Cadre, formatDate, PageHeader, SectionTitle } from "@/components/ui";
import { getBureau } from "@/lib/content/organisation";
import type { Member } from "@/lib/content/types";

export async function generateMetadata(): Promise<Metadata> {
  const { dateElection } = await getBureau();
  return {
    title: "Bureau et commissions",
    description: `Le bureau exécutif de l'ADEMIG${dateElection ? `, élu le ${formatDate(dateElection)}` : ""}, et les commissions qui font vivre l'amicale.`,
    alternates: { canonical: "/bureau" },
  };
}

const iconesCommissions: IconeName[] = ["lingots", "explosion", "partage", "casque"];

function FicheBureau({ membre, priority = false }: { membre: Member; priority?: boolean }) {
  return (
    <li>
      <CarteMembre membre={membre} avecFonction priority={priority} />
    </li>
  );
}

export default async function Bureau() {
  const { dateElection, executif, commissions } = await getBureau();

  return (
    <>
      <PageHeader
        title="Bureau et commissions"
        intro={dateElection ? `Élu le ${formatDate(dateElection)} pour redynamiser l'amicale` : "Les femmes et les hommes qui font vivre l'amicale"}
        illustration="helmet"
      />

      <Cadre aria-labelledby="bureau-executif">
        <SectionTitle id="bureau-executif">Bureau exécutif</SectionTitle>
        <ul className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {executif.map((m, i) => (
            <FicheBureau key={m.slug} membre={m} priority={i === 0} />
          ))}
        </ul>
      </Cadre>

      {commissions.map((c, i) => (
        <Cadre key={c.nom} aria-label={`Commission ${c.nom}`}>
          <div className="flex items-center gap-5">
            <IconeCarre icone={iconesCommissions[i % 4]} ton={ordreTons[i % 3]} taille="sm" />
            <SectionTitle>Commission {c.nom.toLowerCase()}</SectionTitle>
          </div>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed">{c.mission}</p>
          <ul className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {c.membres.map((m) => (
              <FicheBureau key={m.slug} membre={m} />
            ))}
          </ul>
        </Cadre>
      ))}
    </>
  );
}
