/**
 * Indicador de disponibilidade da API.
 * Mantém o operador informado quando a conexão local é interrompida.
 */
(function () {
    const healthUrl = '/api/health';

    function updateStatus(state, message) {
        const indicator = document.getElementById('apiStatus');
        if (!indicator) return;
        indicator.className = `api-status ${state}`;
        indicator.textContent = message;
        indicator.setAttribute('aria-label', message);
    }

    async function checkConnection() {
        if (!navigator.onLine) {
            updateStatus('offline', 'Sem conexão');
            return false;
        }
        try {
            const response = await fetch(healthUrl, { cache: 'no-store' });
            const payload = await response.json();
            if (!response.ok || !payload.success || payload.data.status !== 'online') throw new Error('API indisponível');
            updateStatus('online', 'Sistema online');
            return true;
        } catch (error) {
            updateStatus('offline', 'Servidor indisponível');
            return false;
        }
    }

    window.komodoConnection = { check: checkConnection };
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);
    document.addEventListener('DOMContentLoaded', () => {
        checkConnection();
        window.setInterval(checkConnection, 30000);
    });
})();
