
// Export toast components and functionality
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from "@/components/ui/toast";

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

// Use sonner toast for notifications
export { toast } from "sonner";

// Export our custom toast hook
export { useToast, type ToastProps, type Toast as ToastType, type ToastActionElement } from "@/hooks/use-toast";
