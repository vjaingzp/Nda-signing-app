// Hand-written types mirroring supabase/migrations/0001_init.sql.
// If you have the Supabase CLI linked, prefer generating this instead:
//   npx supabase gen types typescript --linked > src/types/database.ts

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

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Template {
  slug: string;
  name: string;
  description: string | null;
  supports_type: NdaType[];
  sort_order: number;
  is_active: boolean;
}

export interface ClauseLibraryEntry {
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
}

export interface GuidedField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "select";
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

export interface Document {
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
}

export interface DocumentParty {
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
}

export interface DocumentClause {
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
}

export interface SignaturePlacement {
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
}

export interface SigningLink {
  id: string;
  document_id: string;
  token: string;
  party_role: PartyRole;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface SignatureRecord {
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
}

export interface Payment {
  id: string;
  document_id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  mock_reference: string;
  created_at: string;
  completed_at: string | null;
}

// Minimal Database type shape for @supabase/supabase-js generics.
// Expand per-table Row/Insert/Update if you start relying on the
// query builder's generated types; for now the app layer uses the
// interfaces above directly.
export type Database = {
  public: {
    Tables: Record<string, { Row: Record<string, unknown> }>;
  };
};
