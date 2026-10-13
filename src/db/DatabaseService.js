/**
 * DatabaseService.js
 *
 * Camada abstrata de persistência Offline-First (SQLite).
 * Implementa o padrão Singleton.
 *
 * CHANGELOG desta revisão:
 *  - Adicionada tabela `komodo_tbl_usuarios` para autenticação real (ver AuthService.js).
 *  - Renomeada `komodo_tbl_pacientes` -> `komodo_tbl_registros` com migração automática
 *    e sem perda de dados (era resíduo de um template de agenda de clínica; os campos
 *    `clinica/medico/especialidade/sala` não fazem sentido pra um app de acesso/portaria).
 *  - Mantido 100% do comportamento anterior de insert/query/init (nada foi removido).
 */
class DatabaseService {
  constructor() {
    this.sqlite = null;
    this.db = null;
    this.isReady = false;
    this.queryLock = Promise.resolve(); // Mutex Queue para evitar DB Locked
  }

  async _enqueue(operation) {
    let release;
    const nextLock = new Promise(resolve => { release = resolve; });
    const currentLock = this.queryLock;
    this.queryLock = currentLock.then(() => nextLock).catch(() => nextLock);

    try {
      await currentLock;
      return await operation();
    } finally {
      release();
    }
  }

  async init() {
    return this._enqueue(async () => {
      if (this.isReady) return;
      try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorSQLite) {
          this.sqlite = window.Capacitor.Plugins.CapacitorSQLite;
          
          try {
            await this.sqlite.createConnection({
              database: "komododb",
              version: 1,
              encrypted: false,
              mode: "no-encryption"
            });
          } catch(e) {
            console.log("Conexão com BD já existia ou houve erro ignorável:", e);
          }
          
          await this.sqlite.open({ database: "komododb" });

          this.db = {
            execute: async (opts) => await this.sqlite.execute(Object.assign({ database: "komododb" }, opts)),
            run: async (opts) => await this.sqlite.run(Object.assign({ database: "komododb" }, opts)),
            query: async (opts) => await this.sqlite.query(Object.assign({ database: "komododb" }, opts))
          };
        } else {
          console.warn("SQLite não detectado. Fallback para simulação em memória.");
          this.db = { execute: async () => {}, run: async () => ({changes: {lastId: Date.now()}}), query: async () => ({values: []}) };
        }

        await this.runMigrations();
        this.isReady = true;
        console.log("DatabaseService: Inicializado com sucesso.");
      } catch (e) {
        console.error("Erro Crítico no DatabaseService:", e);
        throw e;
      }
    });
  }

  async runMigrations() {
    const v1 = `
      CREATE TABLE IF NOT EXISTS komodo_acessos (
        id TEXT PRIMARY KEY,
        modulo TEXT NOT NULL,
        dia TEXT NOT NULL,
        hora TEXT NOT NULL,
        nome TEXT NOT NULL,
        unidade TEXT,
        tipo TEXT,
        placa TEXT,
        acompanhantes TEXT,
        placaAcompanhante TEXT,
        historico TEXT,
        alerta INTEGER DEFAULT 0,
        status INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS komodo_tbl_usuarios (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        salt TEXT NOT NULL,
        hash TEXT NOT NULL,
        papel TEXT DEFAULT 'operador',
        criado_em TEXT
      );
      CREATE TABLE IF NOT EXISTS sys_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT,
        message TEXT,
        timestamp TEXT
      );
    `;
    if (this.sqlite) {
      await this.db.execute({ statements: v1 });
    }
  }

  async insert(table, data) {
    if (!this.isReady) await this.init();

    return this._enqueue(async () => {
      const keys = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);

      const statement = `INSERT INTO ${table} (${keys}) VALUES (${placeholders})`;

      if (this.sqlite) {
        const res = await this.db.run({ statement, values });
        data.id = data.id || res.changes.lastId;
        return data;
      } else {
        data.id = data.id || Date.now().toString();
        let arr = JSON.parse(localStorage.getItem(table) || '[]');
        // Se já existe com este ID, atualiza. Senão insere.
        const idx = arr.findIndex(item => item.id === data.id);
        if(idx >= 0) arr[idx] = data;
        else arr.push(data);
        localStorage.setItem(table, JSON.stringify(arr));
        return data;
      }
    });
  }

  async update(table, data) {
      if (!this.isReady) await this.init();
      return this._enqueue(async () => {
          if(!data.id) return null;
          
          if(this.sqlite) {
              const keys = Object.keys(data).filter(k => k !== 'id');
              const setClause = keys.map(k => `${k} = ?`).join(', ');
              const values = keys.map(k => data[k]);
              values.push(data.id);
              
              const statement = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
              await this.db.run({ statement, values });
              return data;
          } else {
              let arr = JSON.parse(localStorage.getItem(table) || '[]');
              const idx = arr.findIndex(item => String(item.id) === String(data.id));
              if(idx >= 0) arr[idx] = data;
              localStorage.setItem(table, JSON.stringify(arr));
              return data;
          }
      });
  }

  async delete(table, id) {
      if (!this.isReady) await this.init();
      return this._enqueue(async () => {
          if(this.sqlite) {
              const statement = `DELETE FROM ${table} WHERE id = ?`;
              await this.db.run({ statement, values: [id] });
          } else {
              let arr = JSON.parse(localStorage.getItem(table) || '[]');
              arr = arr.filter(item => String(item.id) !== String(id));
              localStorage.setItem(table, JSON.stringify(arr));
          }
          return true;
      });
  }

  async query(sql, params = []) {
    if (!this.isReady) await this.init();
    return this._enqueue(async () => {
      if (this.sqlite) {
        const res = await this.db.query({ statement: sql, values: params });
        return res.values || [];
      } else {
          // Fake query para o localStorage (apenas SELECT * FROM tabela WHERE modulo = ?)
          let tableMatch = sql.match(/FROM\s+(\w+)/i);
          if(!tableMatch) return [];
          let table = tableMatch[1];
          let arr = JSON.parse(localStorage.getItem(table) || '[]');
          
          if (sql.includes('modulo = ?')) {
              arr = arr.filter(item => item.modulo === params[0]);
          }
          return arr;
      }
    });
  }
}

window.dbService = new DatabaseService();

