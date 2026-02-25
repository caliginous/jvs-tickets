import * as React from 'react'
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react'
import { XIcon } from '@heroicons/react/solid'
import { cn } from './cn'

export interface DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
  static?: boolean // Prevent backdrop clicks from closing
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4',
}

const Dialog = ({ open, onClose, children, size = 'md', className, static: isStatic = false }: DialogProps) => {
  return (
    <Transition.Root show={Boolean(open)} as={React.Fragment}>
      <HeadlessDialog as="div" className="relative z-50" onClose={onClose} static={isStatic}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <HeadlessDialog.Panel
                className={cn(
                  'relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full',
                  sizeClasses[size],
                  className
                )}
              >
                {children}
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition.Root>
  )
}

export const DialogHeader = ({ children, onClose, showClose = true, className }: {
  children: React.ReactNode
  onClose?: () => void
  showClose?: boolean
  className?: string
}) => (
  <div className={cn('flex items-start justify-between p-6 border-b border-gray-200', className)}>
    <div className="flex-1">
      {children}
    </div>
    {showClose && onClose && (
      <button
        type="button"
        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        onClick={onClose}
      >
        <span className="sr-only">Close</span>
        <XIcon className="h-6 w-6" aria-hidden="true" />
      </button>
    )}
  </div>
)

export const DialogBody = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('px-6 py-4', className)}>
    {children}
  </div>
)

export const DialogFooter = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200', className)}>
    {children}
  </div>
)

Dialog.Header = DialogHeader
Dialog.Body = DialogBody
Dialog.Footer = DialogFooter

export { Dialog }
