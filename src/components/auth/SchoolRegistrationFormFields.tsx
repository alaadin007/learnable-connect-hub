import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface SchoolRegistrationFormValues {
  schoolName: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
}

interface SchoolRegistrationFormFieldsProps {
  form: UseFormReturn<SchoolRegistrationFormValues>;
  isLoading: boolean;
  onSubmit: (data: SchoolRegistrationFormValues) => Promise<void>;
}

const SchoolRegistrationFormFields: React.FC<SchoolRegistrationFormFieldsProps> = ({
  form,
  isLoading,
  onSubmit,
}) => {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="schoolName"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="schoolName">School Name</FormLabel>
              <FormControl>
                <Input id="schoolName" placeholder="Enter school name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="adminFullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="adminFullName">Admin Full Name</FormLabel>
              <FormControl>
                <Input id="adminFullName" placeholder="Enter admin's full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="adminEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="adminEmail">Admin Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  id="adminEmail"
                  placeholder="admin@school.edu"
                  {...field}
                  autoComplete="email"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="adminPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="adminPassword">Admin Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  id="adminPassword"
                  placeholder="••••••••"
                  {...field}
                  autoComplete="new-password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="confirmPassword">Confirm Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  id="confirmPassword"
                  placeholder="••••••••"
                  {...field}
                  autoComplete="new-password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading} className="w-full gradient-bg">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registering...
            </>
          ) : (
            "Register School"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default SchoolRegistrationFormFields;