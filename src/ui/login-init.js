
    function showError(el, box, input, message) {
        if (message) el.textContent = '❌ ' + message.toUpperCase();
        box.classList.remove('shake-error');
        void box.offsetWidth;
        box.classList.add('shake-error');
        if (input) input.style.borderColor = '#ef4444';
        el.style.display = 'block';
    }

    function clearError(el, input) {
        el.style.display = 'none';
        if (input) input.style.borderColor = 'var(--glass-border)';
    }

    document.addEventListener('DOMContentLoaded', async function () {
        // Partículas de fundo (motor compartilhado)
        if (window.KomodoFx) window.KomodoFx.init('particles-canvas');
        // Mostrar/ocultar senha (UX fase 1, item 8)
        document.querySelectorAll('[data-pw-toggle]').forEach(function (b) { b.addEventListener('click', function () { var i = document.getElementById(b.getAttribute('data-pw-toggle')); var show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.setAttribute('aria-pressed', show ? 'true' : 'false'); b.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha'); }); });
        if (window.authService.isRemoteMode()) {
            document.getElementById('bsSenha').minLength = 12;
            document.getElementById('bsSenha2').minLength = 12;
            document.getElementById('bootstrapSecretGroup').style.display = 'block';
            document.getElementById('bsBootstrapSecret').required = true;
            document.querySelector('#bootstrapForm > .hint-msg').textContent = 'Primeiro acesso: crie a conta de administrador com senha de pelo menos 12 caracteres e a chave do servidor.';
        }

        const overlay = document.getElementById('loadingOverlay');
        const loadingLabel = document.getElementById('loadingLabel');
        overlay.style.display = 'flex';
        loadingLabel.textContent = 'VERIFICANDO SISTEMA...';

        try {
            if (!window.authService.isRemoteMode()) await window.dbService.init();
        } catch (e) {
            loadingLabel.textContent = 'ERRO AO INICIALIZAR BANCO';
            console.error(e);
            return;
        }

        // Se o usuário já tiver uma sessão válida, pula direto pro app.
        if (window.authService.isAuthenticated()) {
            window.location.href = 'index.html';
            return;
        }

        // Sem conexão: não fica preso em "Verificando sistema"; avisa e tenta de novo quando a internet voltar.
        function offlineStop() { loadingLabel.textContent = 'SEM CONEXÃO — conecte-se à internet para entrar.'; overlay.setAttribute('role', 'alert'); try { window.dispatchEvent(new Event('kac:offline')); } catch (_) {} window.addEventListener('online', function () { window.location.reload(); }, { once: true }); }
        if (navigator.onLine === false) { offlineStop(); return; }
        // Aba nova com sessão de cookie ainda válida (ex.: veio do novo login via "Abrir o sistema"): retoma sem pedir senha de novo.
        if (window.authService.isRemoteMode()) {
            try { const d = await window.apiService.get('/auth/sessao'); if (d && d.user) { sessionStorage.setItem('komodo_session', JSON.stringify({ userId: d.user.id, email: d.user.email, role: d.user.role, expiresAt: d.expiresAt })); window.location.href = 'index.html'; return; } } catch (_) {}
        }

        // Novo login (Fase C): mostra o atalho só se o servidor tiver o flag ligado.
        if (window.authService.isRemoteMode()) { fetch('/api/auth/supabase/config', { credentials: 'same-origin' }).then(function (r) { if (r.ok) document.getElementById('newLoginLink').hidden = false; }).catch(function () {}); }
        let hasAdmin;
        try { hasAdmin = await window.authService.hasAnyUser(); } catch (e) { if (navigator.onLine === false || /conectar/.test(e.message || '')) { offlineStop(); return; } throw e; }
        overlay.style.display = 'none';

        if (hasAdmin) {
            document.getElementById('loginForm').style.display = 'block';
        } else {
            document.getElementById('screenSubtitle').textContent = 'Primeiro Acesso / Configuração Inicial';
            document.getElementById('bootstrapForm').style.display = 'block';
        }

        // ---- Submit do LOGIN ----
        document.getElementById('loginForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            const box = document.querySelector('.login-card');
            const errEl = document.getElementById('errorMsg');
            const emailInput = document.getElementById('inputEmail');
            const passInput = document.getElementById('inputSenha');
            const btn = document.getElementById('btnLogin');

            clearError(errEl, passInput);
            btn.disabled = true;

            try {
                await window.authService.login(emailInput.value, passInput.value);
                overlay.style.display = 'flex';
                loadingLabel.textContent = 'AUTENTICANDO...';
                window.location.href = 'index.html';
            } catch (err) {
                showError(errEl, box, passInput, err.message);
                btn.disabled = false;
            }
        });

        // ---- Submit do BOOTSTRAP (criação do admin) ----
        document.getElementById('bootstrapForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            const box = document.querySelector('.login-card');
            const errEl = document.getElementById('bsErrorMsg');
            const email = document.getElementById('bsEmail');
            const pass = document.getElementById('bsSenha');
            const pass2 = document.getElementById('bsSenha2');
            const secretInput = document.getElementById('bsBootstrapSecret');
            const bootstrapSecret = window.authService.isRemoteMode() ? secretInput.value : '';
            const btn = document.getElementById('btnBootstrap');

            clearError(errEl, pass);

            if (pass.value !== pass2.value) {
                showError(errEl, box, pass2, 'As senhas não coincidem.');
                return;
            }

            btn.disabled = true;
            try {
                await window.authService.createFirstAdmin(email.value, pass.value, bootstrapSecret);
                secretInput.value = '';
                await window.authService.login(email.value, pass.value);
                overlay.style.display = 'flex';
                loadingLabel.textContent = 'CONFIGURAÇÃO CONCLUÍDA...';
                window.location.href = 'index.html';
            } catch (err) {
                showError(errEl, box, pass2, err.message);
                btn.disabled = false;
            } finally {
                if (secretInput) secretInput.value = '';
            }
        });
    });
    