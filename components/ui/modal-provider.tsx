"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export type ModalVariant = "default" | "success" | "error" | "warning";

type ShowModalOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  variant?: ModalVariant;
  onConfirm?: () => void | Promise<void>;
};

type ModalContextValue = {
  showModal: (options: ShowModalOptions) => void;
  hideModal: () => void;
};

type ModalState = {
  open: boolean;
  title: string;
  description?: string;
  confirmText: string;
  variant: ModalVariant;
  onConfirm?: () => void | Promise<void>;
};

const ModalContext = createContext<ModalContextValue | null>(null);

const initialState: ModalState = {
  open: false,
  title: "",
  description: undefined,
  confirmText: "Close",
  variant: "default",
};

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ModalState>(initialState);
  const [isClosing, setIsClosing] = useState(false);

  const hideModal = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setState(initialState);
      setIsClosing(false);
    }, 200);
  }, []);

  const showModal = useCallback((options: ShowModalOptions) => {
    setState({
      open: true,
      title: options.title,
      description: options.description,
      confirmText: options.confirmText ?? "Close",
      variant: options.variant ?? "default",
      onConfirm: options.onConfirm,
    });
    setIsClosing(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (state.onConfirm) {
      await Promise.resolve(state.onConfirm());
    }
    hideModal();
  }, [state.onConfirm, hideModal]);

  const value = useMemo<ModalContextValue>(
    () => ({ showModal, hideModal }),
    [showModal, hideModal]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && state.open) {
        hideModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.open, hideModal]);

  const variantAccent = useMemo(() => {
    switch (state.variant) {
      case "success":
        return "text-emerald-600";
      case "error":
        return "text-red-600";
      case "warning":
        return "text-amber-600";
      default:
        return "text-primary";
    }
  }, [state.variant]);

  return (
    <ModalContext.Provider value={value}>
      {children}
      {state.open ? (
        <div
          className={`modal-overlay ${isClosing ? "modal-overlay-out" : "modal-overlay-in"}`}
          onClick={hideModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            className={`w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all ${
              isClosing ? "modal-content-out" : "modal-content-in"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${variantAccent}`}>
                  {state.variant === "default"
                    ? "Notice"
                    : state.variant === "success"
                    ? "Success"
                    : state.variant === "error"
                    ? "Error"
                    : "Warning"}
                </p>
                <h2 className="text-xl font-semibold text-foreground">{state.title}</h2>
                {state.description ? (
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {state.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={hideModal}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleConfirm} className="cursor-pointer">
                {state.confirmText}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};

