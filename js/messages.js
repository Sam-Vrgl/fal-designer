// js/messages.js
//
// Where a failure gets reported depends on who can do something about it.
//
//   - The user can act on it  -> the UI, in French. They are the audience.
//   - Only a developer can    -> the console, in English. So is that one.
//
// A failure that is neither — nothing the user can do, nothing worth saying —
// should not interrupt them at all. What it must not do is happen in silence
// where the tool then looks merely broken: a palette that failed to load and a
// palette that is empty are indistinguishable until one of them says so.

const ERROR_DIALOG_ID = 'error-modal';
const ERROR_MESSAGE_ID = 'error-modal-message';

// showModal() is what makes a <dialog> modal: it traps focus, closes on
// Escape and paints the backdrop, none of which a hidden div did. Calling it
// on an already-open dialog throws, and one modal can open over another —
// an import can fail while the welcome message is still up.
export function showModal(dialog) {
    if (dialog && !dialog.open) dialog.showModal();
}

export function hideModal(dialog) {
    if (dialog) dialog.close();
}

// An actionable failure, in the shared modal. Non-blocking, unlike the alert()
// this replaces — the page keeps rendering behind it, so the user can still see
// the design they are being told something about.
//
// Falls back to alert() only when the markup is missing, because an error that
// cannot find its element must still be louder than nothing.
export function showError(message) {
    const dialog = document.getElementById(ERROR_DIALOG_ID);
    const target = document.getElementById(ERROR_MESSAGE_ID);

    if (!dialog || !target) {
        alert(message);
        return;
    }

    target.textContent = message;
    showModal(dialog);
}

// Says, in place, that something could not be loaded. Used where the fallback
// is an empty control: a dropdown with nothing in it reads as "this tool is
// broken", which is both alarming and less useful than "try reloading".
export function showInlineNotice(container, message) {
    if (!container) return;

    const existing = container.querySelector('.inline-notice');
    if (existing) {
        existing.textContent = message;
        return;
    }

    const notice = document.createElement('p');
    notice.className = 'inline-notice';
    notice.setAttribute('role', 'status');
    notice.textContent = message;
    container.appendChild(notice);
}
