
// Export sonner toast for notifications
export { toast } from "sonner";

// Re-export our custom toast hook for compatibility
export { 
  useToast, 
  type ToastProps, 
  type Toast, 
  type ToastActionElement,
  cn
} from "@/hooks/use-toast";
