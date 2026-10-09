import type { Reglages } from "@/lib/content/types";

export const reglagesInitiaux: Reglages = {
  contact: {
    // À CONFIRMER : adresse email et téléphone officiels de l'ADEMIG.
    email: "contact@ademig.sn",
    phone: null,
    press: { name: "Birama Ndoye", phone: "+221 77 552 52 25" },
    address: {
      street: "ENSMG, Bâtiment BRGM, Route de l'Université",
      postalBox: "BP 5396 Dakar-Fann",
      city: "Dakar",
      country: "Sénégal",
    },
  },
  // Comptes officiels, relevés sur la chaîne YouTube de l'amicale.
  reseaux: [
    { label: "YouTube", url: "https://www.youtube.com/@ADEMIG-SN" },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/ademig-sn-14041b343/" },
    { label: "Facebook", url: "https://www.facebook.com/share/1AhAE1eCAQ/" },
  ],
  textes: {},
};
