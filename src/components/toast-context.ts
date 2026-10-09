import { createContext, useContext } from 'react'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  tone?: 'info' | 'error'
  action?: ToastAction
  duration?: number
}

export interface ToastApi {
  show: (message: string, options?: ToastOptions) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('ToastProvider 안에서 사용하세요')
  return api
}
