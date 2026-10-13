/*
 * Delegated UI actions for the legacy HTML pages.
 * Keeps behavior explicit without inline event-handler attributes.
 */
(function () {
    'use strict';

    function closeModal(targetId) {
        if (!targetId) return;
        var modal = document.getElementById(targetId);
        if (!modal) return;
        if (modal.tagName && modal.tagName.toLowerCase() === 'komodo-modal') {
            modal.removeAttribute('open');
        } else {
            modal.style.display = 'none';
        }
    }

    document.addEventListener('submit', function (event) {
        if (event.target && event.target.matches('form[data-prevent-submit]')) {
            event.preventDefault();
        }
    });

    document.addEventListener('input', function (event) {
        var target = event.target;
        if (target && target.matches('input[data-uppercase]')) {
            var start = target.selectionStart;
            var end = target.selectionEnd;
            var upper = target.value.toUpperCase();
            if (target.value !== upper) {
                target.value = upper;
                if (typeof start === 'number' && typeof end === 'number') {
                    try { target.setSelectionRange(start, end); } catch (_) {}
                }
            }
        }
    });

    document.addEventListener('click', function (event) {
        var target = event.target && event.target.closest
            ? event.target.closest('[data-action]')
            : null;
        if (!target) return;

        var action = target.dataset.action;
        if (action === 'close-config' || action === 'close-dashboard') {
            closeModal(target.dataset.target);
            return;
        }

        if (action === 'export-advanced-dashboard') {
            if (typeof window.exportAdvancedDashboardReport === 'function') {
                window.exportAdvancedDashboardReport();
            } else {
                console.warn('Exportação avançada indisponível: função não carregada.');
            }
            return;
        }

        if (action === 'set-access-type') {
            var hidden = document.getElementById(target.dataset.target || '');
            if (!hidden) return;
            hidden.value = target.dataset.value || '';
            var group = target.closest('[data-group="tipoAcesso"]');
            if (group) {
                group.querySelectorAll('[data-action="set-access-type"]').forEach(function (button) {
                    button.classList.toggle('active', button === target);
                    button.setAttribute('aria-pressed', button === target ? 'true' : 'false');
                });
            }
        }
    });
})();
