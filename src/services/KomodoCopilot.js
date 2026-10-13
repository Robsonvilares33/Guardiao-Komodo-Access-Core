/**
 * KomodoCopilot.js
 * 
 * Camada de serviço de Inteligência Artificial para atuar como Copiloto.
 * Refatorado na Fase 2 para delegar a comunicação HTTP à Factory (AiProviderAdapter).
 */
class KomodoCopilot {
  constructor() {
    this.contextFiles = [];
    this.recognition = null;
  }

  startVoice(inputId, statusId) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Seu navegador não suporta reconhecimento de voz.');
      return;
    }
    
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new Speech();
    this.recognition.lang = 'pt-BR';
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    const btn = event ? event.currentTarget : null;
    if (btn) btn.classList.add('recording');
    
    if (statusId) {
      const s = document.getElementById(statusId);
      if (s) s.textContent = 'Ouvindo...';
    }

    this.recognition.onresult = (e) => {
      const res = e.results[0][0].transcript;
      const target = document.getElementById(inputId);
      
      if (inputId === 'chat-input') {
        if (target) target.value = res;
        this.sendChatMessage(res);
      } else {
        if (target) {
          target.value = res;
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    };

    this.recognition.onend = () => {
      if (btn) btn.classList.remove('recording');
      if (statusId) {
        const s = document.getElementById(statusId);
        if (s) s.textContent = '';
      }
    };

    this.recognition.start();
  }

  async sendChatMessage(manualText = null) {
    const input = document.getElementById('chat-input');
    const text = manualText || (input ? input.value.trim() : '');
    if (!text) return;

    if (input && !manualText) input.value = '';
    
    this._appendMsg(text, 'user');

    const loaderId = 'loader_' + Date.now();
    this._appendMsg('<div class="chat-loader"><span></span><span></span><span></span></div>', 'bot', loaderId);

    try {
      const systemPrompt = "Você é o Guardião Komodo, IA de segurança e gestão de acesso. Responda de forma concisa e direta. SE o usuário pedir para CADASTRAR, REGISTRAR ou INSERIR, responda APENAS com um JSON neste formato exato (sem formatação markdown): {\"action\": \"CADASTRO\", \"data\": {\"nome\": \"...\", \"doc\": \"...\", \"placa\": \"...\", \"cor\": \"...\"}}. Caso contrário, responda normalmente em texto livre.";

      // [REFATORAÇÃO FASE 2] Usando a Factory em vez de fetch hardcoded
      const aiEngine = window.AiProviderFactory.getProvider();
      
      let response = "";
      if (this.contextFiles.length > 0) {
          // Extrai o base64 (vamos assumir que a imagem 0 é usada)
          const base64 = this.contextFiles[0].data;
          this.contextFiles = [];
          response = await aiEngine.analyzeImage(base64, systemPrompt + " IMAGEM EM ANEXO. APLIQUE OCR E CHAT.");
      } else {
          response = await aiEngine.chat(systemPrompt, text);
      }

      const loader = document.getElementById(loaderId);
      let cleanResponse = response.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      let parsed = null;
      try {
        if (cleanResponse.startsWith('{') && cleanResponse.includes('"action"')) {
          parsed = JSON.parse(cleanResponse);
        }
      } catch(e) {}
      
      if (parsed && parsed.action === 'CADASTRO') {
        if (loader) this._renderMd(loader, "Entendido! Abrindo formulário de cadastro com os dados pré-preenchidos.");
        // Na Fase 3 será emitido um evento via EventBus
        if (typeof window.fillFormWithAI === 'function') {
           window.fillFormWithAI(parsed.data);
        } else {
           alert("Função de auto-preenchimento não encontrada na tela atual.");
        }
      } else {
        if (loader) this._renderMd(loader, response);
      }
    } catch (e) {
      const loader = document.getElementById(loaderId);
      if (loader) loader.textContent = 'Erro da IA (Adapter): ' + String(e.message || 'erro inesperado');
    }
  }

  _appendMsg(content, sender, id = null) {
    const chatMsgs = document.getElementById('chat-messages');
    if (!chatMsgs) return;
    const div = document.createElement('div');
    div.className = 'chat-msg ' + sender;
    if (id) div.id = id;
    if (content === '<div class="chat-loader"><span></span><span></span><span></span></div>') {
      const loader = document.createElement('div');
      loader.className = 'chat-loader';
      for (let i = 0; i < 3; i++) loader.appendChild(document.createElement('span'));
      div.appendChild(loader);
    } else {
      div.textContent = String(content == null ? '' : content);
    }
    chatMsgs.appendChild(div);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  }

  _renderMd(message, text) {
    if (!message) return;
    const source = String(text == null ? '' : text);
    const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|\n/g;
    let cursor = 0;
    let match;
    message.replaceChildren();

    while ((match = pattern.exec(source)) !== null) {
      if (match.index > cursor) {
        message.appendChild(document.createTextNode(source.slice(cursor, match.index)));
      }
      if (match[0] === '\n') {
        message.appendChild(document.createElement('br'));
      } else {
        const element = document.createElement(match[1] !== undefined ? 'strong' : 'em');
        element.textContent = match[1] !== undefined ? match[1] : match[2];
        message.appendChild(element);
      }
      cursor = pattern.lastIndex;
    }
    if (cursor < source.length) {
      message.appendChild(document.createTextNode(source.slice(cursor)));
    }
  }
  _formatMd(text) {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    let html = String(text == null ? '' : text).replace(/[&<>"']/g, character => entities[character]);
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }
}

window.komodoCopilot = new KomodoCopilot();
window.startVoice = (inputId, statusId) => window.komodoCopilot.startVoice(inputId, statusId);
window.sendChatMessage = () => window.komodoCopilot.sendChatMessage();
