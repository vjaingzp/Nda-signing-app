import type { NdaType } from "@/types/database";

export const NDA_TYPE_OPTIONS: {
  value: NdaType;
  label: string;
  description: string;
}[] = [
  {
    value: "one_way",
    label: "One-way",
    description:
      "Only one party is disclosing confidential information — for example, sharing plans with a freelancer or new employee.",
  },
  {
    value: "mutual",
    label: "Mutual",
    description:
      "Both parties are disclosing confidential information to each other — for example, two companies exploring a partnership.",
  },
];
