
import { type Toast, type ToastActionElement } from "@/components/ui/toast";
import { toast as sonnerToast } from "sonner";

// Define types for our toast system
export type ToastProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'destructive';
  duration?: number;
};

// Create a wrapper around sonner toast
export function useToast() {
  const toast = {
    // Basic toast
    toast(props: ToastProps) {
      return sonnerToast(props.title, {
        description: props.description,
        action: props.action,
        duration: props.duration || 5000,
      });
    },
    
    // Success toast
    success(props: ToastProps | string) {
      if (typeof props === 'string') {
        return sonnerToast.success(props);
      }
      return sonnerToast.success(props.title, {
        description: props.description,
        action: props.action,
        duration: props.duration || 5000,
      });
    },
    
    // Error toast
    error(props: ToastProps | string) {
      if (typeof props === 'string') {
        return sonnerToast.error(props);
      }
      return sonnerToast.error(props.title, {
        description: props.description,
        action: props.action,
        duration: props.duration || 5000,
      });
    },
    
    // Warning toast
    warning(props: ToastProps | string) {
      if (typeof props === 'string') {
        return sonnerToast.warning(props);
      }
      return sonnerToast.warning(props.title, {
        description: props.description,
        action: props.action,
        duration: props.duration || 5000,
      });
    },
    
    // Info toast
    info(props: ToastProps | string) {
      if (typeof props === 'string') {
        return sonnerToast.info(props);
      }
      return sonnerToast.info(props.title, {
        description: props.description,
        action: props.action,
        duration: props.duration || 5000,
      });
    },
    
    // Custom styling
    custom(props: ToastProps & { className?: string }) {
      return sonnerToast(props.title, {
        description: props.description,
        action: props.action,
        duration: props.duration || 5000,
        className: props.className,
      });
    },

    // For shadcn/ui toast compatibility
    toasts: [] as Toast[]
  };

  return toast;
}

// Re-export from sonner for direct usage
export { toast } from "sonner";

// Define a Toast type for consistency with shadcn/ui
export type Toast = {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
};

// Export action element type for compatibility
export type ToastActionElement = React.ReactElement;
