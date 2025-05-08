
import * as z from "zod";

// Define the form values type explicitly first
export type SchoolRegistrationFormValues = {
  schoolName: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
};

// Define form schema with validations
export const schoolRegistrationSchema = z.object({
  schoolName: z.string().min(3, "School name must be at least 3 characters"),
  adminFullName: z.string().min(3, "Full name must be at least 3 characters"),
  adminEmail: z.string().email("Please enter a valid email address"),
  adminPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d).*$/,
      "Password must contain at least one letter and one number"
    ),
  confirmPassword: z.string(),
}).refine(
  (data) => data.adminPassword === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);
