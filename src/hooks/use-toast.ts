
import { Toast, ToastActionElement } from "@/components/ui/toast";
import { useToast as useToastFromUI } from "@/components/ui/toaster";

// Re-export the toast components with proper typing
export type { Toast, ToastActionElement };
export const useToast = useToastFromUI;

// Export toast function from sonner for consistency across the app
export { toast } from "sonner";
