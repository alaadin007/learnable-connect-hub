
// This file is intended to re-export toast from the correct location
// Import directly from radix-ui toast implementation
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from "@/components/ui/toast";

import { useToast } from "@/hooks/use-toast";

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  useToast,
};

// Use sonner toast for notifications
export { toast } from "sonner";
