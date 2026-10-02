import React, { useEffect } from "react";
import { createPortal } from "react-dom";

function DetailModal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (!isOpen) return;

    // Prevent background scrolling while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // ESC key listener to close modal
    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "Esc") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="resq-modal-title-heading"
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 id="resq-modal-title-heading" className="modal-title-text">
            {title}
          </h3>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close Modal"
            title="Close (ESC)"
          >
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default DetailModal;
