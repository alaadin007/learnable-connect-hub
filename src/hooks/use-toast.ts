
// Import directly from the UI implementation
import { Toast, ToastActionElement } from "@/components/ui/toast";
import { useToast as useToastUI } from "@/components/ui/use-toast";

// Re-export the toast components with proper typing
export type { Toast, ToastActionElement };
export const useToast = useToastUI;

// Export toast function from sonner for consistency across the app
export { toast } from "sonner";
