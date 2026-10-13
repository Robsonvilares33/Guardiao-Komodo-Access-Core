/**
 * TelemetryService.js
 * 
 * Captura exceções não tratadas e monitora performance (Observabilidade).
 */
class TelemetryService {
  constructor(dbService) {
    this.db = dbService;
    this.initGlobalListeners();
  }

  initGlobalListeners() {
    window.addEventListener('error', (e) => {
      this.logError(e.message, e.filename, e.lineno, e.error ? e.error.stack : null);
    });
    
    window.addEventListener('unhandledrejection', (e) => {
      this.logError(e.reason, 'Promise Rejection', 0, e.reason ? e.reason.stack : null);
    });
  }

  async logError(message, source, lineno, stack) {
    console.error(`[TELEMETRY] Captured: ${message}`);
    const log = {
      level: 'ERROR',
      message: `[${source}:${lineno}] ${message}`,
      timestamp: new Date().toISOString()
    };
    try {
      if (this.db) {
        await this.db.insert('sys_logs', log);
      }
    } catch (dbErr) {
      console.error("Telemetry failed to write log:", dbErr);
    }
  }

  async getRecentLogs(limit = 50) {
    if (!this.db) return [];
    return await this.db.query('SELECT * FROM sys_logs ORDER BY id DESC LIMIT ?', [limit]);
  }
}

window.telemetryService = new TelemetryService(window.dbService);
