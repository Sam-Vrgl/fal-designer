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

const ERROR_OVERLAY_ID = 'error-modal-overlay';
const ERROR_MESSAGE_ID = 'error-modal-message';

export function showModal(overlay) {
    if (overlay) overlay.style.display = 'flex';
}

export function hideModal(overlay) {
    if (overlay) overlay.style.display = 'none';
}

// An actionable failure, in the shared modal. Non-blocking, unlike the alert()
// this replaces — the page keeps rendering behind it, so the user can still see
// the design they are being told something about.
//
// Falls back to alert() only when the markup is missing, because an error that
// cannot find its element must still be louder than nothing.
export function showError(message) {
    const overlay = document.getElementById(ERROR_OVERLAY_ID);
    const target = document.getElementById(ERROR_MESSAGE_ID);

    if (!overlay || !target) {
        alert(message);
        return;
    }

    target.textContent = message;
    showModal(overlay);
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
