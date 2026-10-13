/**
 * O frontend nunca armazena nem transmite chaves de provedores.
 * No desktop, a IA é mediada pelo backend e usa GROQ_API_KEY no ambiente do servidor.
 * No Android/offline, IA permanece indisponível até existir um proxy seguro aprovado.
 */
class GroqAdapter {
  async analyzeImage(base64Image, systemPrompt) {
    if (!window.apiService) throw new Error('Serviço de API não carregado.');
    const imageData = String(base64Image || '').startsWith('data:image/')
      ? base64Image
      : 'data:image/jpeg;base64,' + String(base64Image || '');
    return window.apiService.post('/ai/analyze', { base64Image: imageData, systemPrompt });
  }
  async chat(systemPrompt, userMessage) {
    if (!window.apiService) throw new Error('Serviço de API não carregado.');
    return window.apiService.post('/ai/chat', { systemPrompt, userMessage });
  }
}
class AiProviderFactory {
  static getProvider() {
    if (!window.authService?.isRemoteMode()) {
      throw new Error('IA indisponível no modo offline. Nenhuma chave deve ser inserida no dispositivo.');
    }
    return new GroqAdapter();
  }
}
window.AiProviderFactory = AiProviderFactory;
