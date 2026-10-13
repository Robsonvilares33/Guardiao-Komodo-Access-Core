# Performance (sec. 15): medir antes de otimizar
Baseline (box → produção, 8df505c, 2026-10-13): ver tabela abaixo. **Nenhuma otimização será feita sem uma medição que a justifique.**

| Rota | Mediana (5 req) | Tamanho |
|---|---|---|
| `/` | 0.591757s | 15422 B |
| `/api/health` | 0.817071s | 112 B |
| `/src/ui/AgendaNav.js` | 0.790359s | 4400 B |
| `/api/auth/status` | 1.353698s | 41 B |

Observação: `/api/auth/status` (~1,35 s) inclui cold start + ida ao Supabase (região do projeto vs. região da função). Próximo passo é medir separando cold e warm antes de mexer em região.
