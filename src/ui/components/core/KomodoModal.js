/**
 * KomodoModal.js
 *
 * Web Component leve para modais do Guardião Komodo.
 * Usa Light DOM (sem Shadow DOM) para que document.getElementById()
 * funcione normalmente em todos os scripts do app.
 */
class KomodoModal extends HTMLElement {
    constructor() {
        super();
        this._rendered = false;
    }

    connectedCallback() {
        if (!this._rendered) {
            this.render();
            this.setupEvents();
            this._rendered = true;
        }
    }

    static get observedAttributes() {
        return ['title', 'open'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'open') {
            const overlay = this.querySelector('.modal-overlay');
            if (!overlay) return;
            if (this.hasAttribute('open')) {
                overlay.classList.add('aberto');
            } else {
                overlay.classList.remove('aberto');
            }
        }
    }

    close() {
        this.removeAttribute('open');
        this.dispatchEvent(new CustomEvent('close'));
    }

    setupEvents() {
        const overlay = this.querySelector('.modal-overlay');
        if (!overlay) return;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });
        
        const closeBtn = this.querySelector('.km-btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
    }

    render() {
        const title = this.getAttribute('title') || 'Modal';
        const fragment = document.createDocumentFragment();
        while (this.firstChild) {
            fragment.appendChild(this.firstChild);
        }

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        const content = document.createElement('div');
        content.className = 'modal-content';
        const header = document.createElement('div');
        header.className = 'modal-header';
        const titleNode = document.createElement('div');
        titleNode.className = 'modal-title-text';
        titleNode.textContent = title;
        const closeButton = document.createElement('button');
        closeButton.className = 'km-btn-close';
        closeButton.type = 'button';
        closeButton.setAttribute('aria-label', 'Fechar modal');
        closeButton.textContent = '×';
        const body = document.createElement('div');
        body.className = 'modal-body';

        header.append(titleNode, closeButton);
        body.appendChild(fragment);
        content.append(header, body);
        overlay.appendChild(content);
        this.replaceChildren(overlay);
    }
}
customElements.define('komodo-modal', KomodoModal);
