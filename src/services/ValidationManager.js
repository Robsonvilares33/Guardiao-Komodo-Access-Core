/**
 * ValidationManager.js
 * 
 * Camada pura de Regras de Negócio e Validações.
 * Desacoplada do DOM. Recebe DTOs (Data Transfer Objects) puros
 * e retorna booleanos com lista de erros.
 */

class ValidationManager {
    
    static validateVisitor(visitorDTO) {
        const errors = [];
        
        if (!visitorDTO.nome || visitorDTO.nome.trim().length < 3) {
            errors.push("Nome do visitante deve conter pelo menos 3 caracteres.");
        }
        
        if (visitorDTO.modulo === 'residencial' && (!visitorDTO.unidade || visitorDTO.unidade.trim().length === 0)) {
            errors.push("Unidade de destino é obrigatória.");
        }
        
        if (visitorDTO.placa && visitorDTO.placa !== 'Sem veículo') {
            // A placa pode vir como "ABC-1234 - Preto (Fiat)" ou "ABC-1234 (Fiat)"
            // Vamos extrair apenas a primeira palavra
            const rawPlaca = visitorDTO.placa.split(' ')[0].trim();
            if (!this.isValidMercosulOrOld(rawPlaca)) {
                errors.push("Formato de placa inválido. Use ABC-1234 ou ABC1D23.");
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    static isValidMercosulOrOld(placa) {
        const clean = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (clean.length !== 7) return false;
        
        // Padrão antigo: AAA1234
        const oldRegex = /^[A-Z]{3}[0-9]{4}$/;
        // Padrão Mercosul: AAA1A23
        const newRegex = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
        
        return oldRegex.test(clean) || newRegex.test(clean);
    }
}

window.ValidationManager = ValidationManager;
