import type { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ title, isOpen, onClose, children, footer }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg card-base shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-soft)]">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--color-border-soft)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
