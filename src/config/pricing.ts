type Price = {
  amountFcfa: number;
  label: string;
  source: string;
  verifiedOn: string | null;
};

const projectBrief = "Cahier des charges Max Bara — étape 1";
const cepiciSarl =
  "https://www.cepici.gouv.ci/public/frontend/assets/document/doc3/liste-des-pieces-a-fournir-sarl-capital-inf-a-10-000-000-f-cfa.pdf";
const cepiciReforms =
  "https://cepici.gouv.ci/web/docs/note-de-presentation-des-reformes-2014%2C-focus-doing-business-2015.pdf";

export const pricing = {
  // Cette grille couvre uniquement le scénario chiffré dans le cahier des charges.
  scenario: { legalForm: "SARL" as const, capitalFcfa: 1_000_000 },
  formation: {
    gufe: {
      label: "GUFE (RCCM et dépôt au greffe)",
      amountFcfa: 15_000,
      source: cepiciSarl,
      verifiedOn: "2026-11-19",
    },
    enregistrement: {
      label: "Enregistrement",
      amountFcfa: 3_000,
      source: `${projectBrief} | montant à confirmer, voir ${cepiciReforms}`,
      verifiedOn: null,
    },
    dfe: { label: "DFE", amountFcfa: 1_000, source: projectBrief, verifiedOn: null },
    timbre: {
      label: "Timbre",
      amountFcfa: 3_000,
      source: `${projectBrief} | montant à confirmer, voir ${cepiciReforms}`,
      verifiedOn: null,
    },
    publication: {
      label: "Publication en ligne (CEPICI)",
      amountFcfa: 0,
      source: cepiciSarl,
      verifiedOn: "2026-11-19",
    },
  } satisfies Record<string, Price>,
  options: {
    notaire: {
      label: "Notaire (optionnel)",
      amountFcfa: 141_600,
      source: projectBrief,
      verifiedOn: null,
    },
    domiciliation: {
      label: "Domiciliation (12 mois)",
      amountFcfa: 180_000,
      source: projectBrief,
      verifiedOn: null,
    },
    import_export: {
      label: "Code import-export",
      amountFcfa: 30_000,
      source: cepiciSarl,
      verifiedOn: "2026-11-19",
    },
  } satisfies Record<string, Price>,
  packages: {
    essentiel: { label: "Essentiel", amountFcfa: 149_000, source: projectBrief, verifiedOn: null },
    serenite: { label: "Sérénité", amountFcfa: 299_000, source: projectBrief, verifiedOn: null },
    diaspora: { label: "Diaspora", amountFcfa: 450_000, source: projectBrief, verifiedOn: null },
    agrement: { label: "Agrément", amountFcfa: 750_000, source: projectBrief, verifiedOn: null },
  } satisfies Record<string, Price>,
};
