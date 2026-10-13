/**
 * KomodoButton.js
 * Componente do Design System. Texto e ícone são tratados como texto,
 * nunca como HTML fornecido por atributos.
 */
class KomodoButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    if (this.shadowRoot.querySelector('button')) return;
    const label = this.getAttribute('label') || 'Botão';
    const variantValue = this.getAttribute('variant') || 'primary';
    const variant = ['primary', 'danger', 'ghost'].includes(variantValue) ? variantValue : 'primary';
    const icon = this.getAttribute('icon') || '';
    const fullWidth = this.hasAttribute('full-width');

    const style = document.createElement('style');
    style.textContent = `
      button {
        display: inline-flex; align-items: center; justify-content: center;
        gap: var(--komodo-spacing-sm, 8px);
        font-family: var(--komodo-font-family, 'Poppins', sans-serif);
        font-weight: 600; font-size: var(--komodo-font-size-md, 1rem);
        padding: 12px 24px; border-radius: var(--komodo-border-radius, 12px);
        cursor: pointer; transition: all var(--komodo-transition-fast, 0.2s ease);
        border: none; outline: none; width: auto;
      }
      button.full-width { width: 100%; }
      button.primary { background: linear-gradient(135deg, var(--komodo-color-primary), var(--komodo-color-primary-dark, #b59461)); color: var(--komodo-color-bg, #000); box-shadow: 0 4px 15px rgba(194, 160, 87, 0.3); }
      button.primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(194, 160, 87, 0.4); }
      button.primary:active { transform: translateY(0); }
      button.danger { background: var(--komodo-color-danger, #e74c3c); color: #fff; }
      button.ghost { background: transparent; border: 1px solid var(--komodo-color-primary); color: var(--komodo-color-primary); }
    `;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = variant + (fullWidth ? ' full-width' : '');
    if (icon) {
      const iconNode = document.createElement('span');
      iconNode.textContent = icon;
      button.appendChild(iconNode);
    }
    button.appendChild(document.createTextNode(label));
    button.addEventListener('click', () => this.dispatchEvent(new Event('click')));
    this.shadowRoot.replaceChildren(style, button);
  }
}
customElements.define('komodo-button', KomodoButton);
