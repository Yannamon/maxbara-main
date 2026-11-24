export const documentFields: Record<string, readonly [string, string, string][]> = {
  statutes: [["name", "Company name", "Dénomination"], ["purpose", "Business purpose", "Objet social"], ["capital", "Capital and contributions", "Capital et apports"], ["shareholders", "Shareholders and ownership", "Associés et répartition"], ["management", "Management and signing powers", "Gérance et pouvoirs"], ["duration", "Duration and financial year", "Durée et exercice social"]],
  subscription: [["subscribers", "Subscribers and shares", "Souscripteurs et parts"], ["subscribed", "Subscribed capital (FCFA)", "Capital souscrit (FCFA)"], ["paid", "Capital paid (FCFA)", "Capital versé (FCFA)"], ["deposit", "Deposit details and date", "Dépôt et date"]],
  decisions: [["date", "Meeting / decision date", "Date de réunion / décision"], ["attendees", "Participants and shares represented", "Participants et parts représentées"], ["resolutions", "Resolutions and votes", "Résolutions et votes"], ["signatories", "Signatories", "Signataires"]],
  address: [["address", "Complete registered address", "Adresse complète du siège"], ["evidence", "Lease, ownership or domiciliation", "Bail, propriété ou domiciliation"], ["parties", "Owner / provider and occupier", "Propriétaire / prestataire et occupant"], ["terms", "Dates, term and rent where applicable", "Dates, durée et loyer si applicable"]],
  declaration: [["director", "Director’s full name", "Nom du dirigeant"], ["birth", "Date and place of birth", "Date et lieu de naissance"], ["residence", "Residential address", "Domicile"], ["statement", "Statement details for review", "Éléments de la déclaration à vérifier"], ["date", "Intended signing date and place", "Date et lieu de signature prévus"]],
  managers: [["directors", "Full names and roles", "Noms et fonctions"], ["birth", "Birth details and nationality", "Naissance et nationalité"], ["addresses", "Residential addresses", "Domiciles"], ["powers", "Signing powers and certifier", "Pouvoirs et certificateur"]],
  map: [["address", "Business address", "Adresse d’activité"], ["landmarks", "Landmarks and directions", "Repères et itinéraire"], ["coordinates", "Map link or coordinates", "Lien cartographique ou coordonnées"]],
  gufe: [["declarant", "Declarant and capacity", "Déclarant et qualité"], ["company", "Company identification and capital", "Identification de la société et capital"], ["activities", "Activities and projected turnover", "Activités et chiffre d’affaires prévu"], ["office", "Registered office and contacts", "Siège et coordonnées"], ["people", "Managers, shareholders and employees", "Dirigeants, associés et salariés"]],
  notarySlip: [["notary", "Notary and office", "Notaire et étude"], ["acts", "Acts to be filed", "Actes à déposer"], ["references", "Dates and deed references", "Dates et références des actes"]],
  parentStatutes: [["parent", "Corporate shareholder’s legal name", "Dénomination de l’associé personne morale"], ["jurisdiction", "Country and legal form", "Pays et forme juridique"], ["articles", "Articles date and amendments", "Date des statuts et modifications"], ["representative", "Legal representative", "Représentant légal"]],
  parentRegistration: [["parent", "Corporate shareholder’s name", "Nom de l’associé personne morale"], ["registry", "Registry and registration number", "Registre et numéro d’immatriculation"], ["date", "Extract date and issuing authority", "Date de l’extrait et autorité émettrice"]],
  parentage: [["person", "Person’s full name", "Nom de la personne"], ["birth", "Date and place of birth", "Date et lieu de naissance"], ["parents", "Parents’ full names", "Noms des parents"], ["issuer", "Document type and issuing authority", "Type de pièce et autorité émettrice"]],
  criminalRecord: [["director", "Director’s full name", "Nom du dirigeant"], ["birth", "Date and place of birth", "Date et lieu de naissance"], ["issuer", "Issuing authority and extract date", "Autorité émettrice et date de l’extrait"]],
  compliance: [["contributors", "Contributors", "Apporteurs"], ["assets", "Assets contributed and valuation", "Biens apportés et évaluation"], ["declaration", "Compliance details for review", "Éléments de conformité à vérifier"], ["signatories", "Signatories and date", "Signataires et date"]],
  mandate: [["principal", "Principal’s full name", "Nom du mandant"], ["representative", "Representative’s full name and contact", "Nom et coordonnées du mandataire"], ["powers", "Authorized actions and limits", "Actes autorisés et limites"], ["validity", "Validity dates", "Dates de validité"], ["legalisation", "Authentication authority and country", "Autorité de légalisation et pays"]],
  workerIdentity: [["worker", "Worker’s full name", "Nom du salarié"], ["birth", "Birth details and parentage", "Naissance et filiation"], ["employment", "Role and planned employment date", "Fonction et date d’embauche prévue"]],
};

export function parseDocumentDraft(type: string, form: FormData): Record<string, string> | null {
  const fields = Object.hasOwn(documentFields, type) ? documentFields[type] : undefined;
  if (!fields) return null;
  const result: Record<string, string> = {};
  for (const [name] of fields) {
    const value = form.get(name);
    if (typeof value !== "string" || value.trim().length > 3000) return null;
    result[name] = value.trim();
  }
  return Object.values(result).some(Boolean) ? result : null;
}
