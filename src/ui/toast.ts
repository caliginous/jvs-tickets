import { toast } from 'sonner'

export const showToast = {
  success: (message: string) => toast.success(message, {
    duration: 4000,
  }),

  error: (message: string) => toast.error(message, {
    duration: 6000,
  }),

  loading: (message: string) => toast.loading(message, {
    duration: 0,
  }),

  dismiss: (toastId: string) => toast.dismiss(toastId),

  custom: (message: string, options?: any) => toast(message, options),
}

export { toast }
