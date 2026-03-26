import { create } from "zustand"

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
}

let counter = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = String(++counter)
    const duration = toast.duration ?? 5000

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }))

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, duration)
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))

export function toast(props: Omit<Toast, "id">) {
  useToastStore.getState().addToast(props)
}

export function useToast() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.removeToast)
  return { toasts, toast, dismiss }
}
