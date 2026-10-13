/**
 * FormulariosBase.js
 * 
 * Componente responsável por gerenciar a lógica de negócios, validação
 * e persistência dos Formulários Auxiliares (Visitante, Morador, Prestador, Entregador, Representante).
 * 
 * Atualizado: usa komodo_tbl_registros (tabela unificada).
 */
class FormulariosBase {
  constructor(dbService) {
    this.db = dbService;
  }

  gv(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  async _saveBase(tipo, idPrefix, buildEntry) {
    const nome = this.gv(`${idPrefix}-nome`);
    if (!nome) { 
      alert(`Nome do ${tipo.toLowerCase()} é obrigatório.`); 
      return; 
    }

    const now = new Date();
    const baseEntry = {
      nome: nome,
      tipo_acesso: tipo,
      horario: now.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
      timestamp: now.toISOString()
    };

    const specificData = buildEntry(this);
    const entry = { ...baseEntry, ...specificData };

    try {
      const savedEntry = await this.db.insert('komodo_tbl_registros', entry);
      
      // Inject into ResDB
      entry.id = savedEntry.id;
      entry.tipo = tipo;
      entry.alerta = false;
      entry.foto = (window.state && window.state.capturedPhoto) ? window.state.capturedPhoto : null;
      
      if (typeof window.addToResDB === 'function') {
        window.addToResDB(entry);
        if (typeof window.renderResCards === 'function') window.renderResCards();
      }

      if (typeof window.closeModal === 'function') window.closeModal(`modal-form-${idPrefix}`);
      if (typeof window.tryVibrate === 'function') window.tryVibrate([50, 30, 50]);
      
      alert(`✅ ${tipo} ${nome} registrado(a)!`);
      this._clearForm(idPrefix);
    } catch (e) {
      console.error(`Erro ao salvar ${tipo}:`, e);
      alert(`Erro ao salvar ${tipo}. Verifique o log.`);
    }
  }

  _clearForm(prefix) {
    const inputs = document.querySelectorAll(`[id^="${prefix}-"]`);
    inputs.forEach(el => {
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    });
  }

  async saveVisitante() {
    await this._saveBase('Visitante', 'visitante', (ctx) => ({
      doc: ctx.gv('visitante-doc'),
      local: ctx.gv('visitante-destino'),
      obs: ctx.gv('visitante-obs')
    }));
  }

  async saveMorador() {
    await this._saveBase('Morador', 'morador', (ctx) => ({
      local: ctx.gv('morador-unidade')
    }));
  }

  async savePrestador() {
    await this._saveBase('Prestador', 'prestador', (ctx) => ({
      local: ctx.gv('prestador-destino'),
      responsavel: ctx.gv('prestador-empresa'),
      obs: ctx.gv('prestador-obs')
    }));
  }

  async saveEntregador() {
    await this._saveBase('Entregador', 'entregador', (ctx) => ({
      local: ctx.gv('entregador-destino'),
      responsavel: ctx.gv('entregador-app')
    }));
  }

  async saveRepresentante() {
    await this._saveBase('Representante', 'representante', (ctx) => ({
      local: ctx.gv('representante-contato'),
      responsavel: ctx.gv('representante-marca')
    }));
  }
}

// Expõe globalmente
window.formulariosBase = new FormulariosBase(window.dbService);
window.saveVisitante = () => window.formulariosBase.saveVisitante();
window.saveMorador = () => window.formulariosBase.saveMorador();
window.savePrestador = () => window.formulariosBase.savePrestador();
window.saveEntregador = () => window.formulariosBase.saveEntregador();
window.saveRepresentante = () => window.formulariosBase.saveRepresentante();
