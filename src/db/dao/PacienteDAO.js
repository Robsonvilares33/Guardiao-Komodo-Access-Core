/**
 * PacienteDAO.js
 * 
 * Data Access Object para isolar queries SQL de registros.
 * Atualizado: usa komodo_tbl_registros (tabela migrada).
 */
class PacienteDAO {
  constructor(dbService) {
    this.db = dbService;
  }

  _sanitize(obj) {
    const sanitized = {};
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        sanitized[key] = obj[key]
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      } else {
        sanitized[key] = obj[key];
      }
    }
    return sanitized;
  }

  async insert(registro) {
    try {
      const clean = this._sanitize(registro);
      clean.id = clean.id || Date.now().toString();
      return await this.db.insert('komodo_tbl_registros', clean);
    } catch (e) {
      console.error('PacienteDAO.insert erro:', e);
      throw e;
    }
  }

  async findAll() {
    try {
      return await this.db.query('SELECT * FROM komodo_tbl_registros ORDER BY timestamp DESC');
    } catch (e) {
      console.error('PacienteDAO.findAll erro:', e);
      return [];
    }
  }

  async findById(id) {
    try {
      const res = await this.db.query('SELECT * FROM komodo_tbl_registros WHERE id = ?', [id]);
      return res.length > 0 ? res[0] : null;
    } catch (e) {
      console.error('PacienteDAO.findById erro:', e);
      return null;
    }
  }
}

window.pacienteDAO = new PacienteDAO(window.dbService);
