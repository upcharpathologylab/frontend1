import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import SignInForm from "./SignInForm.jsx";
import SignUpForm from "./SignUpForm.jsx";

function AuthModal({ isOpen, mode, onModeChange, onClose, onSuccess, onSignupSuccess }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/60 backdrop-blur-sm ${mode === "signup" ? "p-2 sm:p-3" : "p-2 sm:p-4"}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={mode === "signin" ? "Sign in" : "Sign up"}
            className={`relative w-full rounded-2xl bg-white shadow-2xl ${
              mode === "signin" ? "max-w-[900px]" : "max-w-[680px]"
            } ${mode === "signup" ? "max-h-[90dvh] overflow-visible" : "max-h-[90dvh] overflow-y-auto"}`}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: 0.22 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={`absolute flex items-center justify-center rounded-full bg-blue-50 text-navy-900 transition hover:bg-blue-100 ${
                mode === "signup" ? "right-3 top-3 h-8 w-8" : "right-4 top-4 h-10 w-10"
              }`}
              onClick={onClose}
              aria-label="Close auth popup"
            >
              <X className={mode === "signup" ? "h-4 w-4" : "h-5 w-5"} />
            </button>

            {mode === "signin" ? (
              <SignInForm onModeChange={onModeChange} onSuccess={onSuccess} />
            ) : (
              <SignUpForm onModeChange={onModeChange} onSuccess={onSuccess} onSignupSuccess={onSignupSuccess} />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AuthModal;
