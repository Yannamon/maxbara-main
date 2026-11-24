import type { Locale } from "../site/answers";

export const adminCopy = {
  fr: {
    title: "Administration", list: "Dossiers", heading: "Suivi des dossiers",
    client: "Espace client", periods: "Échéances internes à partir de la transmission à Max Bara.",
    review: "Première revue", delivery: "Livraison", hours: "h", days: "jours", active: "en cours",
    overdue: "en retard", noDeadline: "—", deadline: "Échéances", allDeadlines: "Toutes",
    search: "Société ou référence", status: "Statut", allStatuses: "Tous",
    filter: "Filtrer", reset: "Réinitialiser", noCases: "Aucun dossier ne correspond aux filtres.",
    previous: "Précédent", next: "Suivant", page: "Page",
    company: "Société", margin: "Marge brute estimée", reviewDue: "Revue",
    deliveryDue: "Livraison", verification: "A VERIFIER", from: "À partir de",
    progress: "Avancement client", clientVisible: "Ces renseignements s’affichent dans l’espace client.",
    clientNext: "Prochaine étape", clientDate: "Date prévue", save: "Enregistrer",
    timing: "Suivi des échéances", received: "Dossier transmis le", reviewed: "Revue effectuée le",
    delivered: "Dossier livré le", closeReview: "Marquer la revue terminée",
    documents: "Pièces du dossier", noDocuments: "Aucun document reçu.",
    view: "Ouvrir", download: "Télécharger", notes: "Notes internes",
    noteHint: "Visible uniquement par l’équipe Max Bara.", writeNote: "Nouvelle note",
    addNote: "Ajouter la note", noNotes: "Aucune note interne.", team: "Équipe Max Bara",
    fees: "Tarifs et sources", catalog: "Grille tarifaire et vérifications",
    source: "Source", verified: "Vérifié le", quotes: "Détail du devis",
    quoteExplanation: "Marge calculée sur le dernier devis, en déduisant son coût plancher.",
    emptyQuote: "Aucun devis enregistré.", anonymous: "—",
    messages: { saved: "Mise à jour enregistrée.", unavailable: "La mise à jour n’a pas abouti. Vérifiez les champs et réessayez." },
  },
  en: {
    title: "Administration", list: "Cases", heading: "Case management",
    client: "Client area", periods: "Internal deadlines start when Max Bara receives the application.",
    review: "Initial review", delivery: "Delivery", hours: "h", days: "days", active: "open",
    overdue: "overdue", noDeadline: "—", deadline: "Deadlines", allDeadlines: "All",
    search: "Company or reference", status: "Status", allStatuses: "All",
    filter: "Filter", reset: "Reset", noCases: "No cases match these filters.",
    previous: "Previous", next: "Next", page: "Page",
    company: "Company", margin: "Estimated gross margin", reviewDue: "Review",
    deliveryDue: "Delivery", verification: "A VERIFIER", from: "Starting at",
    progress: "Client progress", clientVisible: "These details appear in the client area.",
    clientNext: "Next step", clientDate: "Expected date", save: "Save",
    timing: "Deadline tracking", received: "Application received", reviewed: "Review completed",
    delivered: "Application delivered", closeReview: "Mark review complete",
    documents: "Case documents", noDocuments: "No documents received.",
    view: "Open", download: "Download", notes: "Internal notes",
    noteHint: "Visible to the Max Bara team only.", writeNote: "New note",
    addNote: "Add note", noNotes: "No internal notes.", team: "Max Bara team",
    fees: "Fees and sources", catalog: "Pricing catalog and verification",
    source: "Source", verified: "Verified on", quotes: "Estimate details",
    quoteExplanation: "Margin is the latest estimate minus its recorded cost floor.",
    emptyQuote: "No estimate on file.", anonymous: "—",
    messages: { saved: "Update saved.", unavailable: "The update could not be saved. Check the fields and try again." },
  },
} satisfies Record<Locale, object>;

export function adminDate(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CI" : "en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Abidjan",
  }).format(date);
}
