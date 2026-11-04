import { useState } from "react";
import "./ConfirmDeleteDialog.scss";

type ConfirmDeleteDialogProps = {
  title: string;
  description: string;
  /** The user must type this exactly to enable the delete button. */
  confirmName: string;
  deleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmDeleteDialog = ({
  title,
  description,
  confirmName,
  deleting,
  error,
  onConfirm,
  onCancel,
}: ConfirmDeleteDialogProps) => {
  const [typedName, setTypedName] = useState("");

  return (
    <div className="delete-confirm-modal">
      <div className="delete-confirm-modal__overlay" onClick={onCancel} />
      <div
        className="delete-confirm-modal__content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
      >
        <h3 id="delete-confirm-title">{title}</h3>
        <p>{description}</p>
        <p>
          To confirm, please enter the name: <strong>{confirmName}</strong>
        </p>
        <input
          type="text"
          className="delete-confirm-modal__input"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder="Enter the name to confirm"
          aria-label="Name to confirm deletion"
          autoFocus
        />
        {error && <div className="delete-confirm-modal__error">{error}</div>}
        <div className="delete-confirm-modal__actions">
          <button
            type="button"
            className="delete-confirm-modal__cancel"
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="delete-confirm-modal__confirm"
            onClick={onConfirm}
            disabled={deleting || typedName !== confirmName}
          >
            {deleting ? "Deleting..." : title}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteDialog;
