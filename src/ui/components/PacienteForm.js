/**
 * PacienteForm.js
 * 
 * Componente responsável por gerenciar a lógica de negócios, validação
 * e persistência atômica do Formulário de Pacientes.
 * 
 * Atualizado: usa komodo_tbl_registros. Protegido contra crash em tabelas
 * auxiliares que ainda não foram criadas no schema.
 */
class PacienteForm {
  constructor(dbService) {
    this.db = dbService;
  }

  gv(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  async save() {
    try {
      const nome = this.gv('paciente-nome');
      if (!nome) { 
        alert('Nome do paciente é obrigatório.'); 
        return; 
      }

      const now = new Date();
      
      const registro = {
        nome: nome,
        cpf: this.gv('paciente-cpf'),
        rg: this.gv('paciente-rg'),
        doc: this.gv('paciente-doc'),
        tel: this.gv('paciente-tel'),
        sexo: this.gv('paciente-sexo'),
        nasc: this.gv('paciente-nasc'),
        hora_prevista: this.gv('paciente-hora'),
        local: this.gv('paciente-clinica'),
        responsavel: this.gv('paciente-medico'),
        tipo_acesso: this.gv('paciente-espec') || 'Paciente',
        portaria: this.gv('paciente-sala'),
        obs: this.gv('paciente-obs'),
        horario: now.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
        timestamp: now.toISOString()
      };

      // 1. Salva Registro Principal
      const saved = await this.db.insert('komodo_tbl_registros', registro);
      const registroId = saved.id;

      // 2. Integração legada (Feed do Residencial)
      const entry = {
        id: registroId,
        nome: nome,
        tipo: 'Paciente',
        doc: registro.doc || registro.cpf || registro.rg,
        destino: registro.local + (registro.portaria ? ' / Sala ' + registro.portaria : ''),
        placa: this.gv('paciente-v-placa'),
        marca: this.gv('paciente-v-marca'),
        obs: registro.obs,
        horario: registro.horario,
        alerta: false,
        foto: (window.state && window.state.capturedPhoto) ? window.state.capturedPhoto : null,
        veiculo: this.gv('paciente-v-marca') || 'A pé',
        medico: registro.responsavel,
        acompanhante: this.gv('paciente-a-nome')
      };
      
      if (typeof window.addToResDB === 'function') {
        window.addToResDB(entry);
        if (typeof window.renderResCards === 'function') window.renderResCards();
      }

      if (typeof window.closeModal === 'function') window.closeModal('modal-form-paciente');
      if (typeof window.tryVibrate === 'function') window.tryVibrate([50, 30, 50]);
      
      alert(`✅ Paciente ${nome} registrado com sucesso!`);
      this.clearForm();

    } catch (e) {
      console.error("Erro ao salvar paciente:", e);
      alert('Erro ao salvar paciente. Verifique o log.');
    }
  }

  clearForm() {
    const ids = [
      'paciente-nome', 'paciente-cpf', 'paciente-rg', 'paciente-doc', 'paciente-tel',
      'paciente-sexo', 'paciente-nasc', 'paciente-hora', 'paciente-clinica', 'paciente-medico',
      'paciente-espec', 'paciente-sala', 'paciente-obs',
      'paciente-v-tipo', 'paciente-v-marca', 'paciente-v-modelo', 'paciente-v-versao', 'paciente-v-ano',
      'paciente-v-cor', 'paciente-v-placa', 'paciente-v-vaga',
      'paciente-a-nome', 'paciente-a-parentesco', 'paciente-a-doc', 'paciente-a-tel',
      'paciente-a-v-tipo', 'paciente-a-v-marca', 'paciente-a-v-modelo', 'paciente-a-v-cor',
      'paciente-a-v-placa', 'paciente-a-v-vaga'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else el.value = '';
      }
    });
  }
}

// Expõe globalmente
window.pacienteForm = new PacienteForm(window.dbService);
window.saveRelationalPaciente = () => window.pacienteForm.save();
