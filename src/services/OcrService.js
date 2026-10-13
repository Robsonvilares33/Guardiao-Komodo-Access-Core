/**
 * OcrService.js
 * 
 * Camada de serviço de Visão Computacional.
 * Refatorado na Fase 2 para usar a Fábrica Abstrata de IA (AiProviderFactory).
 * Não conhece mais os endpoints do Groq ou Gemini diretamente.
 */
class OcrService {
  constructor() {
    this.videoElement = null;
    this.stream = null;
    this.targetId = null;
  }

  start(target) {
    this.targetId = target;
    
    // A IA só funciona pelo proxy autenticado do backend no desktop.
    // Nunca consultar nem guardar chaves no armazenamento do navegador.
    if (!window.authService || !window.authService.isRemoteMode()) {
      alert('OCR com IA indisponível no modo offline. A configuração segura do servidor é necessária.');
      return;
    }

    const modal = document.getElementById('modal-ocr');
    const video = document.getElementById('ocr-video');
    this.videoElement = video;
    
    if (modal) modal.classList.add('active');

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => { 
        this.stream = s; 
        if (video) video.srcObject = s; 
      })
      .catch(e => {
        alert('Erro ao acessar câmera: ' + e.message);
        this.close();
      });
  }

  async capture() {
    if (!this.videoElement) return;

    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;
    canvas.getContext('2d').drawImage(this.videoElement, 0, 0);
    const b64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    
    this.close();
    
    const targetEl = document.getElementById(this.targetId);
    if (targetEl && this.targetId !== 'autofill') targetEl.value = 'Processando...';

    let prompt = "";
    if (this.targetId === 'autofill') {
      prompt = "Analise esta imagem. Extraia os dados estruturados e retorne APENAS no formato JSON válido: {\"nome\": \"...\", \"doc\": \"...\", \"placa\": \"...\", \"cor\": \"...\"}. NENHUM texto extra.";
      if (typeof window.showGlobalLoader === 'function') window.showGlobalLoader("Analisando imagem via Factory...");
    } else {
      const type = this.targetId.includes('placa') ? 'placa' : 'doc';
      prompt = type === 'placa' 
        ? "Extraia APENAS a placa do veículo desta imagem. Formato AAA-1234 ou Mercosul." 
        : "Extraia o CPF ou RG deste documento. Retorne APENAS os números formatados.";
    }

    await this.processImage(b64, prompt, targetEl);
  }

  async processImage(base64Image, customPrompt = null, targetEl = null) {
    let prompt = customPrompt || "Analise esta imagem. Extraia os dados estruturados e retorne APENAS no formato JSON válido: {\"nome\": \"...\", \"doc\": \"...\", \"placa\": \"...\", \"cor\": \"...\"}. Se não houver, deixe vazio.";
    
    try {
        const aiEngine = window.AiProviderFactory.getProvider();
        const res = await aiEngine.analyzeImage(base64Image, prompt);

        if (this.targetId === 'autofill' || !this.targetId) {
          if (typeof window.hideGlobalLoader === 'function') window.hideGlobalLoader();
          
          let jsonStr = res.replace(/```json/gi, '').replace(/```/g, '').trim();
          const data = JSON.parse(jsonStr);
          
          if (typeof window.formManager !== 'undefined' && typeof window.formManager.fill === 'function') {
             // Injeta no form ativo via FormManager (Fase 4/5)
             const formId = document.getElementById('sectionMorador').classList.contains('active') ? 'form-morador' : 'form-visitante';
             window.formManager.fill(formId, data);
             alert('✨ Dados extraídos pela IA!\n\n' + JSON.stringify(data, null, 2));
          } else if (typeof window.fillFormWithAI === 'function') {
             window.fillFormWithAI(data);
          }
        } else {
          if (targetEl) targetEl.value = res;
        }

    } catch (err) {
        if (this.targetId === 'autofill' || !this.targetId) {
          if (typeof window.hideGlobalLoader === 'function') window.hideGlobalLoader();
        } else {
          if (targetEl) targetEl.value = 'Erro OCR';
        }
        alert('Falha OCR (Adapter): ' + err.message);
    }
  }

  close() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }
    const modal = document.getElementById('modal-ocr');
    if (modal) modal.classList.remove('active');
  }
}

window.ocrService = new OcrService();
window.triggerOCR = (id) => window.ocrService.start(id);
window.closeOCR = () => window.ocrService.close();
window.captureOCR = () => window.ocrService.capture();
