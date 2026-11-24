import { pricing } from "../config/pricing.ts";

export type QuoteRequest = {
  legalForm: string;
  capitalFcfa: number;
  package: keyof typeof pricing.packages;
  hasAddress: boolean;
  notarized?: boolean;
  needsImportExport?: boolean;
};

type QuoteErrorCode = "UNSUPPORTED_SCENARIO" | "INVALID_SELECTION" | "BELOW_COST_FLOOR";

export class QuoteError extends Error {
  constructor(publicCode: QuoteErrorCode, message: string) {
    super(message);
    this.name = "QuoteError";
    this.code = publicCode;
  }

  readonly code: QuoteErrorCode;
}

export function computeQuote(request: QuoteRequest) {
  if (
    request.legalForm !== pricing.scenario.legalForm ||
    request.capitalFcfa !== pricing.scenario.capitalFcfa
  ) {
    throw new QuoteError("UNSUPPORTED_SCENARIO", "Ce scénario nécessite une étude tarifaire.");
  }

  const { hasAddress, notarized = false, needsImportExport = false } = request;
  if (
    !Object.hasOwn(pricing.packages, request.package) ||
    typeof hasAddress !== "boolean" ||
    typeof notarized !== "boolean" ||
    typeof needsImportExport !== "boolean"
  ) {
    throw new QuoteError("INVALID_SELECTION", "Sélection de devis invalide.");
  }

  const selectedPackage = pricing.packages[request.package];
  const formationCodes = Object.keys(pricing.formation) as (keyof typeof pricing.formation)[];
  const formation = formationCodes.map((code) => ({ code, ...pricing.formation[code] }));
  const options = [
    ...(notarized ? [{ code: "notaire" as const, ...pricing.options.notaire }] : []),
    ...(!hasAddress ? [{ code: "domiciliation" as const, ...pricing.options.domiciliation }] : []),
    ...(needsImportExport ? [{ code: "import_export" as const, ...pricing.options.import_export }] : []),
  ];

  const formationCost = formation.reduce((sum, line) => sum + line.amountFcfa, 0);
  const optionsCost = options.reduce((sum, line) => sum + line.amountFcfa, 0);
  const costFloorFcfa = formationCost + optionsCost;
  const totalFcfa = selectedPackage.amountFcfa + optionsCost;

  if (totalFcfa < costFloorFcfa) {
    throw new QuoteError("BELOW_COST_FLOOR", "Le devis est inférieur au coût plancher.");
  }

  const lines = [
    ...formation,
    {
      ...selectedPackage,
      code: "service" as const,
      label: `Accompagnement — ${selectedPackage.label}`,
      amountFcfa: selectedPackage.amountFcfa - formationCost,
    },
    ...options,
  ];

  return {
    package: request.package,
    currency: "XOF" as const,
    statutes: notarized ? "notarized" as const : "private_deed" as const,
    kind: request.package === "agrement" ? "starting_at" as const : "estimate" as const,
    lines,
    totalFcfa,
    costFloorFcfa,
    requiresVerification: lines.some((line) => line.verifiedOn === null),
  };
}
