import { useEffect, useRef, useCallback } from "react";

interface ConfirmDialogProps {
    text: string;
    open: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

export const ConfirmDialog = ({ text, open, onConfirm, onClose }: ConfirmDialogProps) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const confirmButtonRef = useRef<HTMLButtonElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);

    // Memoize handlers to prevent unnecessary re-renders
    const handleConfirm = useCallback(() => {
        console.log('handleConfirm called');
        try {
            onConfirm();
        } catch (error) {
            console.error('Error in confirm handler:', error);
        }
    }, [onConfirm]);

    const handleClose = useCallback(() => {
        console.log('handleClose called');
        try {
            onClose();
        } catch (error) {
            console.error('Error in close handler:', error);
        }
    }, [onClose]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                handleClose();
            }
        };

        if (open) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [open, handleClose]);

    // Focus management
    useEffect(() => {
        if (open && cancelButtonRef.current) {
            // Focus the cancel button when dialog opens
            const timer = setTimeout(() => {
                cancelButtonRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [open]);

    // Don't render anything if not open
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={handleClose}
            />
            
            {/* Dialog */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div 
                    ref={dialogRef}
                    className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                >
                    {/* Header */}
                    <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                            </div>
                            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                <h3 className="text-base font-semibold leading-6 text-gray-900" id="modal-title">
                                    Delete Event
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500">
                                        <span dangerouslySetInnerHTML={{ __html: text || 'Are you sure you want to delete this item?' }} />
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                        <button
                            ref={confirmButtonRef}
                            type="button"
                            className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                            onClick={handleConfirm}
                            id="confirm-confirm-button"
                        >
                            Delete
                        </button>
                        <button
                            ref={cancelButtonRef}
                            type="button"
                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                            onClick={handleClose}
                            id="confirm-cancel-button"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
