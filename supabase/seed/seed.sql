-- =========================================================================
-- Seed data: starter templates + default clause library
-- Run after supabase/migrations/0001_init.sql
-- =========================================================================
-- Placeholders in default_body are resolved at render/preview time from:
--   - document_parties (disclosing/receiving/mutual party names, addresses)
--   - documents.effective_date, documents.term_months, documents.governing_law
--   - document_clauses.guided_field_values (for that clause's own guided fields)
-- Governing law is fixed to India across every template (see requirement #11);
-- the governing_law clause is still a normal core clause so it renders
-- consistently with the rest of the document, it just has no editable fields.
-- =========================================================================

insert into public.templates (slug, name, description, supports_type, sort_order) values
  ('freelancer_client',    'Freelancer / Client',        'Protects project details, deliverables, and client information shared during freelance engagements.', array['one_way','mutual']::nda_type[], 1),
  ('business_partnership', 'Business Partnership',       'Covers information shared between two companies exploring or running a joint venture or partnership.', array['mutual','one_way']::nda_type[], 2),
  ('employer_employee',    'Employer / Employee',        'Protects company confidential information disclosed to an employee or contractor during employment.', array['one_way']::nda_type[], 3),
  ('startup_investor',     'Startup / Investor',         'Covers pitch materials, financials, and cap table details shared with a prospective investor.', array['one_way','mutual']::nda_type[], 4),
  ('vendor_agreement',     'Vendor Agreement',           'Protects business information exchanged with a vendor or service provider during an engagement.', array['one_way','mutual']::nda_type[], 5)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  supports_type = excluded.supports_type,
  sort_order = excluded.sort_order;

-- -------------------------------------------------------------------------
-- CORE CLAUSES (template_slug = null -> shared by every template)
-- Not removable. Only the fields in guided_fields can be edited; the
-- surrounding legal language is fixed.
-- -------------------------------------------------------------------------

insert into public.clause_library
  (template_slug, clause_key, title, category, default_body, guided_fields, is_removable, sort_order)
values
(
  null, 'definition_of_confidential_information', 'Definition of Confidential Information', 'core',
  'For the purposes of this Agreement, "Confidential Information" means any and all non-public information disclosed by one party ("Disclosing Party") to the other ("Receiving Party"), whether in written, oral, electronic, or other form, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure. This includes, without limitation, information disclosed in connection with the following purpose: {{purpose}}.',
  '[{"key":"purpose","label":"Purpose of disclosure","type":"textarea","placeholder":"e.g. evaluating a potential freelance engagement for website development","required":true}]'::jsonb,
  false, 10
),
(
  null, 'obligations_of_receiving_party', 'Obligations of the Receiving Party', 'core',
  'The Receiving Party shall: (a) hold the Confidential Information in strict confidence; (b) use the Confidential Information solely for the purpose described above; (c) not disclose the Confidential Information to any third party without the Disclosing Party''s prior written consent, except to employees, agents, or advisors who have a legitimate need to know and who are bound by confidentiality obligations at least as protective as those in this Agreement; and (d) protect the Confidential Information using at least the same degree of care it uses for its own confidential information, and in no event less than a reasonable degree of care.',
  '[]'::jsonb,
  false, 20
),
(
  null, 'term_and_duration', 'Term and Duration', 'core',
  'This Agreement shall remain in effect from the Effective Date and the confidentiality obligations herein shall survive for a period of {{term_months}} months following the date of disclosure of the relevant Confidential Information, regardless of any earlier termination of the business relationship between the parties.',
  '[{"key":"term_months","label":"Confidentiality period (months)","type":"number","placeholder":"24","required":true}]'::jsonb,
  false, 90
),
(
  null, 'governing_law_and_jurisdiction', 'Governing Law and Jurisdiction', 'core',
  'This Agreement shall be governed by and construed in accordance with the laws of India, without regard to its conflict of laws principles. The courts located in India shall have exclusive jurisdiction over any dispute arising out of or relating to this Agreement.',
  '[]'::jsonb,
  false, 100
)
on conflict (template_slug, clause_key) do update set
  title = excluded.title,
  category = excluded.category,
  default_body = excluded.default_body,
  guided_fields = excluded.guided_fields,
  is_removable = excluded.is_removable,
  sort_order = excluded.sort_order;

-- -------------------------------------------------------------------------
-- OPTIONAL CLAUSES (template_slug = null -> offered on every template)
-- Freely editable and removable by the user.
-- -------------------------------------------------------------------------

insert into public.clause_library
  (template_slug, clause_key, title, category, default_body, guided_fields, is_removable, sort_order)
values
(
  null, 'exclusions_from_confidential_information', 'Exclusions from Confidential Information', 'optional',
  'Confidential Information does not include information that: (a) is or becomes publicly available through no fault of the Receiving Party; (b) was already known to the Receiving Party prior to disclosure, as shown by written records; (c) is independently developed by the Receiving Party without use of the Confidential Information; or (d) is rightfully received from a third party without breach of any confidentiality obligation.',
  '[]'::jsonb, true, 30
),
(
  null, 'return_or_destruction_of_materials', 'Return or Destruction of Materials', 'optional',
  'Upon the Disclosing Party''s written request, or upon termination of the parties'' business relationship, the Receiving Party shall promptly return or destroy all documents, materials, and other tangible manifestations of the Confidential Information, and shall certify such return or destruction in writing if requested.',
  '[]'::jsonb, true, 40
),
(
  null, 'no_license_granted', 'No License Granted', 'optional',
  'Nothing in this Agreement shall be construed as granting any rights, by license or otherwise, to any Confidential Information disclosed hereunder, or to any invention, discovery, or improvement made prior to or after the date of this Agreement.',
  '[]'::jsonb, true, 50
),
(
  null, 'non_solicitation', 'Non-Solicitation', 'optional',
  'During the term of this Agreement and for a period of twelve (12) months thereafter, neither party shall directly or indirectly solicit for employment any employee of the other party who was involved in the discussions contemplated by this Agreement, without the prior written consent of the other party.',
  '[]'::jsonb, true, 60
),
(
  null, 'remedies_and_injunctive_relief', 'Remedies and Injunctive Relief', 'optional',
  'The parties acknowledge that any breach of this Agreement may cause irreparable harm for which monetary damages would be an inadequate remedy, and that the non-breaching party shall be entitled to seek injunctive relief, in addition to any other remedies available at law or in equity.',
  '[]'::jsonb, true, 70
),
(
  null, 'entire_agreement', 'Entire Agreement', 'optional',
  'This Agreement constitutes the entire understanding between the parties with respect to its subject matter and supersedes all prior discussions, negotiations, and agreements, whether written or oral, relating to such subject matter. Any amendment must be in writing and signed by both parties.',
  '[]'::jsonb, true, 80
)
on conflict (template_slug, clause_key) do update set
  title = excluded.title,
  category = excluded.category,
  default_body = excluded.default_body,
  guided_fields = excluded.guided_fields,
  is_removable = excluded.is_removable,
  sort_order = excluded.sort_order;

-- -------------------------------------------------------------------------
-- TEMPLATE-SPECIFIC OPTIONAL CLAUSES
-- -------------------------------------------------------------------------

insert into public.clause_library
  (template_slug, clause_key, title, category, default_body, guided_fields, is_removable, sort_order)
values
(
  'employer_employee', 'intellectual_property_assignment', 'Intellectual Property Assignment', 'optional',
  'Any inventions, work product, or other intellectual property conceived or developed by the Receiving Party in the course of their engagement, using or relating to the Confidential Information, shall be the sole property of the Disclosing Party, subject to applicable law.',
  '[]'::jsonb, true, 45
),
(
  'startup_investor', 'no_obligation_to_proceed', 'No Obligation to Proceed', 'optional',
  'Nothing in this Agreement obligates either party to proceed with any investment, transaction, or business relationship. Either party may terminate discussions at any time without liability, other than the confidentiality obligations set out in this Agreement.',
  '[]'::jsonb, true, 46
),
(
  'vendor_agreement', 'data_protection', 'Data Protection', 'optional',
  'To the extent the Confidential Information includes personal data, the Receiving Party shall process such data solely for the purpose described in this Agreement and in accordance with applicable data protection laws in India.',
  '[]'::jsonb, true, 47
),
(
  'business_partnership', 'publicity', 'Publicity', 'optional',
  'Neither party shall issue any press release or public statement regarding the existence or subject matter of the discussions contemplated by this Agreement without the prior written consent of the other party.',
  '[]'::jsonb, true, 48
)
on conflict (template_slug, clause_key) do update set
  title = excluded.title,
  category = excluded.category,
  default_body = excluded.default_body,
  guided_fields = excluded.guided_fields,
  is_removable = excluded.is_removable,
  sort_order = excluded.sort_order;
