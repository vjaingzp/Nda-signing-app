import { z } from "zod";

const partyTypeSchema = z.enum(["individual", "business"]);

export const detailsFormSchema = z
  .object({
    effectiveDate: z.string().min(1, "Effective date is required"),
    termMonths: z.coerce
      .number({ error: "Enter the confidentiality term in months" })
      .int("Enter a whole number of months")
      .positive("Enter a positive number of months"),

    partyAType: partyTypeSchema,
    partyAFullName: z.string().trim().min(1, "Full name is required"),
    partyACompanyName: z.string().trim().optional().default(""),
    partyAAddress: z.string().trim().min(1, "Address is required"),
    partyAEmail: z.email("Enter a valid email address"),

    partyBType: partyTypeSchema,
    partyBFullName: z.string().trim().min(1, "Full name is required"),
    partyBCompanyName: z.string().trim().optional().default(""),
    partyBAddress: z.string().trim().min(1, "Address is required"),
    partyBEmail: z.email("Enter a valid email address"),
  })
  .refine((d) => d.partyAType !== "business" || d.partyACompanyName.length > 0, {
    message: "Business name is required",
    path: ["partyACompanyName"],
  })
  .refine((d) => d.partyBType !== "business" || d.partyBCompanyName.length > 0, {
    message: "Business name is required",
    path: ["partyBCompanyName"],
  });

export type DetailsFormValues = z.infer<typeof detailsFormSchema>;
