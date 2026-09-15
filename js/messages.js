// js/messages.js

const ERROR_DIALOG_ID = 'error-modal';
const ERROR_MESSAGE_ID = 'error-modal-message';

export function showModal(dialog) {
    if (dialog && !dialog.open) dialog.showModal();
}

export function hideModal(dialog) {
    if (dialog) dialog.close();
}

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
