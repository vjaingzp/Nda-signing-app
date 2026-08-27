// Hand-written types mirroring supabase/migrations/0001_init.sql.
// If you have the Supabase CLI linked, prefer generating this instead:
//   npx supabase gen types typescript --linked > src/types/database.ts
//
// The `Database` type at the bottom must satisfy postgrest-js's
// `GenericSchema` (each table needs Row/Insert/Update/Relationships, plus
// Views and Functions maps) or the query builder silently types
// everything as `never` instead of erroring — so keep Insert/Update in
// sync with the SQL defaults (a column is optional on Insert only if the
// database supplies it, via `default` or nullability).

export type NdaType = "one_way" | "mutual";
export type DocumentSource = "template" | "upload";
export type DocumentStatus =
  | "draft"
  | "pending_payment"
  | "awaiting_signatures"
  | "partially_signed"
  | "completed"
  | "expired";
export type PartyRole =
  | "disclosing"
  | "receiving"
  | "mutual"
  | "uploader"
  | "counterparty";
export type PartyType = "individual" | "business";
export type ClauseCategory = "core" | "optional";
export type PaymentStatus = "pending" | "succeeded" | "failed";

export type GuidedField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "select";
  options?: string[];
  placeholder?: string;
  required?: boolean;
  // Used to fill in a sensible, complete sentence when the user hasn't
  // customized this field yet, so a document reads cleanly with zero edits.
  default?: string;
};

// ---------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------
export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
};
type ProfileInsert = Pick<Profile, "id" | "email"> &
  Partial<Pick<Profile, "full_name" | "created_at" | "updated_at">>;
type ProfileUpdate = Partial<ProfileInsert>;

// ---------------------------------------------------------------------
// templates
// ---------------------------------------------------------------------
export type Template = {
  slug: string;
  name: string;
  description: string | null;
  supports_type: NdaType[];
  sort_order: number;
  is_active: boolean;
};
type TemplateInsert = Pick<Template, "slug" | "name"> &
  Partial<Pick<Template, "description" | "supports_type" | "sort_order" | "is_active">>;
type TemplateUpdate = Partial<TemplateInsert>;

// ---------------------------------------------------------------------
// clause_library
// ---------------------------------------------------------------------
export type ClauseLibraryEntry = {
  id: string;
  template_slug: string | null;
  clause_key: string;
  title: string;
  category: ClauseCategory;
  default_body: string;
  guided_fields: GuidedField[];
  is_removable: boolean;
  sort_order: number;
  created_at: string;
};
type ClauseLibraryInsert = Pick<
  ClauseLibraryEntry,
  "clause_key" | "title" | "category" | "default_body"
> &
  Partial<
    Pick<
      ClauseLibraryEntry,
      "id" | "template_slug" | "guided_fields" | "is_removable" | "sort_order" | "created_at"
    >
  >;
type ClauseLibraryUpdate = Partial<ClauseLibraryInsert>;

// ---------------------------------------------------------------------
// documents
// ---------------------------------------------------------------------
export type Document = {
  id: string;
  user_id: string;
  title: string;
  source: DocumentSource;
  template_slug: string | null;
  nda_type: NdaType | null;
  status: DocumentStatus;
  governing_law: string;
  effective_date: string | null;
  term_months: number | null;
  details: Record<string, unknown>;
  upload_storage_path: string | null;
  upload_filename: string | null;
  upload_page_count: number | null;
  final_pdf_storage_path: string | null;
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
  expires_at: string;
  deletion_reminder_sent_at: string | null;
  deleted_at: string | null;
};
type DocumentInsert = Pick<Document, "user_id"> &
  Partial<Omit<Document, "user_id" | "id">> & { id?: string };
type DocumentUpdate = Partial<DocumentInsert>;

// ---------------------------------------------------------------------
// document_parties
// ---------------------------------------------------------------------
export type DocumentParty = {
  id: string;
  document_id: string;
  role: PartyRole;
  party_type: PartyType;
  full_name: string;
  company_name: string | null;
  address: string | null;
  email: string | null;
  sort_order: number;
  created_at: string;
};
type DocumentPartyInsert = Pick<DocumentParty, "document_id" | "role" | "full_name"> &
  Partial<
    Pick<
      DocumentParty,
      "id" | "party_type" | "company_name" | "address" | "email" | "sort_order" | "created_at"
    >
  >;
type DocumentPartyUpdate = Partial<DocumentPartyInsert>;

// ---------------------------------------------------------------------
// document_clauses
// ---------------------------------------------------------------------
export type DocumentClause = {
  id: string;
  document_id: string;
  clause_key: string;
  title: string;
  category: ClauseCategory;
  body: string;
  guided_field_values: Record<string, unknown>;
  is_included: boolean;
  is_removable: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
type DocumentClauseInsert = Pick<
  DocumentClause,
  "document_id" | "clause_key" | "title" | "category" | "body"
> &
  Partial<
    Pick<
      DocumentClause,
      | "id"
      | "guided_field_values"
      | "is_included"
      | "is_removable"
      | "sort_order"
      | "created_at"
      | "updated_at"
    >
  >;
type DocumentClauseUpdate = Partial<DocumentClauseInsert>;

// ---------------------------------------------------------------------
// signature_placements
// ---------------------------------------------------------------------
export type SignaturePlacement = {
  id: string;
  document_id: string;
  party_role: PartyRole;
  page_number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  field_type: "signature" | "date" | "name";
  created_at: string;
};
type SignaturePlacementInsert = Pick<
  SignaturePlacement,
  "document_id" | "party_role" | "x" | "y"
> &
  Partial<
    Pick<
      SignaturePlacement,
      "id" | "page_number" | "width" | "height" | "field_type" | "created_at"
    >
  >;
type SignaturePlacementUpdate = Partial<SignaturePlacementInsert>;

// ---------------------------------------------------------------------
// signing_links
// ---------------------------------------------------------------------
export type SigningLink = {
  id: string;
  document_id: string;
  token: string;
  party_role: PartyRole;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};
type SigningLinkInsert = Pick<SigningLink, "document_id" | "party_role"> &
  Partial<Pick<SigningLink, "id" | "token" | "expires_at" | "used_at" | "created_at">>;
type SigningLinkUpdate = Partial<SigningLinkInsert>;

// ---------------------------------------------------------------------
// signatures
// ---------------------------------------------------------------------
export type SignatureRecord = {
  id: string;
  document_id: string;
  signing_link_id: string | null;
  party_role: PartyRole;
  signer_name: string;
  signer_email: string | null;
  consent_given: boolean;
  consent_text: string;
  typed_signature: string;
  ip_address: string | null;
  user_agent: string | null;
  signed_at: string;
};
type SignatureInsert = Pick<
  SignatureRecord,
  "document_id" | "party_role" | "signer_name" | "typed_signature"
> &
  Partial<
    Pick<
      SignatureRecord,
      | "id"
      | "signing_link_id"
      | "signer_email"
      | "consent_given"
      | "consent_text"
      | "ip_address"
      | "user_agent"
      | "signed_at"
    >
  >;
type SignatureUpdate = Partial<SignatureInsert>;

// ---------------------------------------------------------------------
// payments
// ---------------------------------------------------------------------
export type Payment = {
  id: string;
  document_id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  mock_reference: string;
  created_at: string;
  completed_at: string | null;
};
type PaymentInsert = Pick<Payment, "document_id" | "user_id"> &
  Partial<
    Pick<
      Payment,
      "id" | "amount_cents" | "currency" | "status" | "mock_reference" | "created_at" | "completed_at"
    >
  >;
type PaymentUpdate = Partial<PaymentInsert>;

// ---------------------------------------------------------------------
// Database — shape required by @supabase/postgrest-js's GenericSchema
// ---------------------------------------------------------------------
type Table<Row, Insert, Update = Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, ProfileInsert, ProfileUpdate>;
      templates: Table<Template, TemplateInsert, TemplateUpdate>;
      clause_library: Table<ClauseLibraryEntry, ClauseLibraryInsert, ClauseLibraryUpdate>;
      documents: Table<Document, DocumentInsert, DocumentUpdate>;
      document_parties: Table<DocumentParty, DocumentPartyInsert, DocumentPartyUpdate>;
      document_clauses: Table<DocumentClause, DocumentClauseInsert, DocumentClauseUpdate>;
      signature_placements: Table<
        SignaturePlacement,
        SignaturePlacementInsert,
        SignaturePlacementUpdate
      >;
      signing_links: Table<SigningLink, SigningLinkInsert, SigningLinkUpdate>;
      signatures: Table<SignatureRecord, SignatureInsert, SignatureUpdate>;
      payments: Table<Payment, PaymentInsert, PaymentUpdate>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
