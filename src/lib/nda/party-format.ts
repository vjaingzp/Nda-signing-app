import type { DocumentParty, NdaType, PartyRole } from "@/types/database";

export type PreviewParty = Pick<
  DocumentParty,
  "role" | "party_type" | "full_name" | "company_name" | "address" | "email"
>;

export function partyRole(
  party: PreviewParty | undefined,
  ndaType: NdaType | null,
  index: number
): PartyRole {
  if (party) return party.role;
  if (ndaType === "mutual") return "mutual";
  return index === 0 ? "disclosing" : "receiving";
}

export function partyLabel(role: PartyRole, index: number): string {
  if (role === "disclosing") return "Disclosing Party";
  if (role === "receiving") return "Receiving Party";
  if (role === "uploader") return "Uploader";
  if (role === "counterparty") return "Counterparty";
  return index === 0 ? "Party A" : "Party B";
}

export function partyDescription(party: PreviewParty | undefined): string {
  if (!party) return "[party details not yet provided]";
  const who =
    party.party_type === "business" && party.company_name
      ? `${party.full_name}, on behalf of ${party.company_name}`
      : party.full_name;
  const address = party.address ? `, of ${party.address}` : "";
  const email = party.email ? ` (${party.email})` : "";
  return `${who}${address}${email}`;
}
