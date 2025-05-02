
// This file intended to export toast functionality to the app
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from "@/components/ui/toast";

import { useToast as useToastHook } from "@radix-ui/react-toast";

// Export components from toast.tsx
export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};

// Export the hook
export const useToast = useToastHook;

// Use sonner toast for notifications
export { toast } from "sonner";
