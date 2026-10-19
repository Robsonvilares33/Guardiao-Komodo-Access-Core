/*! Guardião Komodo — bundle residencial (gerado por scripts/build-bundles.mjs, não editar) src-sha256=a7e5e011668686f060de7b3951887baca893f8a30eb995a48d9c7ce4a3a0ec3a */
/* src/core/KomodoDate.js */
/**
 * KomodoDate — data "de hoje" sempre no fuso America/Sao_Paulo,
 * independente do fuso do aparelho/navegador.
 */
(function (root) {
  const TZ = 'America/Sao_Paulo';
  const KEYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const WEEK_ORDER = { seg: 0, ter: 1, qua: 2, qui: 3, sex: 4, sab: 5, dom: 6 };

  // Criar Intl.DateTimeFormat é caro; um por fuso basta.
  const FMT = {};
  function fmt(timeZone) { return FMT[timeZone] || (FMT[timeZone] = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })); }
  function todayParts(now = new Date(), timeZone = TZ) {
    const parts = fmt(timeZone).formatToParts(now).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
    const year = Number(parts.year), month = Number(parts.month), day = Number(parts.day);
    // Data civil pura (UTC ao meio-dia) para fazer aritmética de dias sem efeito de fuso.
    const civil = new Date(Date.UTC(year, month - 1, day, 12));
    return { year, month, day, weekday: civil.getUTCDay(), dayKey: KEYS[civil.getUTCDay()], civil };
  }

  function todayKey(now, timeZone) { return todayParts(now, timeZone).dayKey; }

  /** Datas (dia do mês) da semana corrente, de segunda a domingo. */
  let reference = null; // ISO 'YYYY-MM-DD' da semana em exibição (null = semana atual)
  function setReference(iso) { reference = iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null; }
  function getReference() { return reference; }
  function toISO(p) { return p.year + '-' + String(p.month).padStart(2, '0') + '-' + String(p.day).padStart(2, '0'); }
  function todayISO(now, timeZone) { return toISO(todayParts(now, timeZone)); }
  function addDaysISO(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function weekdayKeyOfISO(iso) { return KEYS[new Date(iso + 'T12:00:00Z').getUTCDay()]; }

  function weekDates(now, timeZone) {
    if (now === undefined && reference) now = new Date(reference + 'T15:00:00Z');
    const t = todayParts(now, timeZone);
    const offsetToMonday = (t.weekday + 6) % 7;
    const monday = new Date(t.civil.getTime() - offsetToMonday * 86400000);
    const out = {};
    Object.keys(WEEK_ORDER).forEach(k => {
      const d = new Date(monday.getTime() + WEEK_ORDER[k] * 86400000);
      out[k] = { day: d.getUTCDate(), month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
    });
    return out;
  }

  const api = { TZ, KEYS, todayParts, todayKey, weekDates, setReference, getReference, toISO, todayISO, addDaysISO, weekdayKeyOfISO };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KomodoDate = api;
})(typeof window !== 'undefined' ? window : null);

;
/* src/ui/residencial-init.js */

    // Bloqueia acesso à tela se não houver sessão válida.
    if (window.authService) {
        window.authService.requireAuth('login.html');
    }

    // ==================================================
    // ENGINE DE PARTÍCULAS
    // ==================================================
    if (window.KomodoParticles) {
        if (window.KomodoFx) window.KomodoFx.init('particles-canvas', { count: 50 });
    }

    // ==================================================
    // BANCO DE DADOS DE MARCAS
    // ==================================================
    var marcasBrasil = [
        { cat: "Carros Populares", nome: "Fiat", tipo: "Carro" }, { cat: "Carros Populares", nome: "Volkswagen", tipo: "Carro" }, { cat: "Carros Populares", nome: "Chevrolet", tipo: "Carro" }, { cat: "Carros Populares", nome: "Ford", tipo: "Carro" }, { cat: "Carros Populares", nome: "Toyota", tipo: "Carro" }, { cat: "Carros Populares", nome: "Honda", tipo: "Carro" }, { cat: "Carros Populares", nome: "Hyundai", tipo: "Carro" }, { cat: "Carros Populares", nome: "Renault", tipo: "Carro" }, { cat: "Carros Populares", nome: "Nissan", tipo: "Carro" }, { cat: "Carros Populares", nome: "Jeep", tipo: "Carro" }, { cat: "Carros Populares", nome: "Peugeot", tipo: "Carro" }, { cat: "Carros Populares", nome: "Citroën", tipo: "Carro" }, { cat: "Carros Populares", nome: "Caoa Chery", tipo: "Carro" }, { cat: "Carros Populares", nome: "BYD", tipo: "Carro" }, { cat: "Carros Populares", nome: "GWM", tipo: "Carro" },
        { cat: "Carros Premium", nome: "Audi", tipo: "Carro" }, { cat: "Carros Premium", nome: "BMW", tipo: "Carro" }, { cat: "Carros Premium", nome: "Mercedes-Benz", tipo: "Carro" }, { cat: "Carros Premium", nome: "Volvo", tipo: "Carro" }, { cat: "Carros Premium", nome: "Land Rover", tipo: "Carro" }, { cat: "Carros Premium", nome: "Porsche", tipo: "Carro" }, { cat: "Carros Premium", nome: "Mitsubishi", tipo: "Carro" }, { cat: "Carros Premium", nome: "Lexus", tipo: "Carro" }, { cat: "Carros Premium", nome: "Jaguar", tipo: "Carro" }, { cat: "Carros Premium", nome: "Mini", tipo: "Carro" }, { cat: "Carros Premium", nome: "Subaru", tipo: "Carro" },
        { cat: "Motos", nome: "Honda (Moto)", tipo: "Moto" }, { cat: "Motos", nome: "Yamaha", tipo: "Moto" }, { cat: "Motos", nome: "Suzuki", tipo: "Moto" }, { cat: "Motos", nome: "Kawasaki", tipo: "Moto" }, { cat: "Motos", nome: "BMW (Moto)", tipo: "Moto" }, { cat: "Motos", nome: "Triumph", tipo: "Moto" }, { cat: "Motos", nome: "Royal Enfield", tipo: "Moto" }, { cat: "Motos", nome: "Dafra", tipo: "Moto" }, { cat: "Motos", nome: "Haojue", tipo: "Moto" }, { cat: "Motos", nome: "Shineray", tipo: "Moto" }, { cat: "Motos", nome: "Ducati", tipo: "Moto" }, { cat: "Motos", nome: "Harley-Davidson", tipo: "Moto" },
        { cat: "Caminhões / Outros", nome: "Scania", tipo: "Carro" }, { cat: "Caminhões / Outros", nome: "Volvo (Caminhão)", tipo: "Carro" }, { cat: "Caminhões / Outros", nome: "Iveco", tipo: "Carro" }, { cat: "Caminhões / Outros", nome: "Mercedes-Benz (Caminhão)", tipo: "Carro" }, { cat: "Caminhões / Outros", nome: "VW Caminhões", tipo: "Carro" }, { cat: "Caminhões / Outros", nome: "Agrale", tipo: "Carro" }
    ];

    var vehicleSelectors = {
        listWrapperVis: { type: 'Carro', labelId: 'labelDropdownVis', panelId: 'dropdownPanelVis', typeInputId: 'hiddenTipoVeicVis', brandInputId: 'hiddenMarcaVeicVis' },
        listWrapperVisAcomp: { type: 'Carro', labelId: 'labelDropdownVisAcomp', panelId: 'dropdownPanelVisAcomp', typeInputId: 'hiddenTipoVeicAcompVis', brandInputId: 'hiddenMarcaVeicAcompVis' },
        listWrapperMor: { type: 'Carro', labelId: 'labelDropdownMor', panelId: 'dropdownPanelMor', typeInputId: 'hiddenTipoVeicMor', brandInputId: 'hiddenMarcaVeicMor' },
        listWrapperMorAcomp: { type: 'Carro', labelId: 'labelDropdownMorAcomp', panelId: 'dropdownPanelMorAcomp', typeInputId: 'hiddenTipoVeicAcompMor', brandInputId: 'hiddenMarcaVeicAcompMor' }
    };

    var selectorTargetMap = {
        Vis: 'listWrapperVis',
        VisAcomp: 'listWrapperVisAcomp',
        Mor: 'listWrapperMor',
        MorAcomp: 'listWrapperMorAcomp'
    };

    var panelToWrapper = {
        dropdownPanelVis: 'listWrapperVis',
        dropdownPanelVisAcomp: 'listWrapperVisAcomp',
        dropdownPanelMor: 'listWrapperMor',
        dropdownPanelMorAcomp: 'listWrapperMorAcomp'
    };

    function renderBrandList(wrapperId, filterText) {
        var wrapper = document.getElementById(wrapperId);
        if (!wrapper) return;
        filterText = filterText || '';
        wrapper.replaceChildren();

        var selector = (typeof vehicleSelectors !== 'undefined') ? vehicleSelectors[wrapperId] : null;
        var isFirst = wrapperId === 'listWrapper1';
        var activeType = selector ? selector.type : (isFirst ? activeType1 : activeType2);
        var labelId = selector ? selector.labelId : (isFirst ? 'labelDropdown1' : 'labelDropdown2');
        var panelId = selector ? selector.panelId : (isFirst ? 'dropdownPanel1' : 'dropdownPanel2');
        if (!activeType || !labelId || !panelId) return;

        var currentCat = '';
        var matchCount = 0;
        for (var i = 0; i < marcasBrasil.length; i++) {
            var m = marcasBrasil[i];
            if (m.tipo !== activeType) continue;
            if (filterText && m.nome.toLowerCase().indexOf(filterText.toLowerCase()) === -1) continue;

            if (m.cat !== currentCat) {
                var group = document.createElement('div');
                group.className = 'brand-list-group';
                group.textContent = m.cat;
                wrapper.appendChild(group);
                currentCat = m.cat;
            }

            var item = document.createElement('div');
            item.className = 'brand-item';
            item.dataset.brand = m.nome;
            item.dataset.label = labelId;
            item.dataset.panel = panelId;
            item.textContent = m.nome;
            wrapper.appendChild(item);
            matchCount++;
        }

        if (!matchCount) {
            var empty = document.createElement('div');
            empty.className = 'brand-item';
            empty.style.color = 'var(--text-muted)';
            empty.textContent = 'Nenhuma marca encontrada.';
            wrapper.appendChild(empty);
        }
    }
    // ==================================================
    // EVENT DELEGATION — TODOS OS CLIQUES DO MODAL
    // ==================================================
    document.getElementById('modalContent').addEventListener('click', function(e) {
        var target = e.target;

        // 0. TABS (Morador vs Visitante)
        if (target.classList.contains('modal-tab')) {
            var allTabs = document.querySelectorAll('.modal-tab');
            var allSecs = document.querySelectorAll('.modal-section');
            for(var i=0; i<allTabs.length; i++) allTabs[i].classList.remove('active');
            for(var i=0; i<allSecs.length; i++) allSecs[i].classList.remove('active');
            
            target.classList.add('active');
            document.getElementById(target.getAttribute('data-target')).classList.add('active');
            e.stopPropagation();
            return;
        }

        // 1. TOGGLE BUTTONS (Pessoal/Serviço, Carro/Moto)
        if (target.classList.contains('btn-toggle') && target.tagName === 'BUTTON') {
            var group = target.closest('.btn-toggle-group');
            if (group) {
                var btns = group.querySelectorAll('.btn-toggle');
                for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
                target.classList.add('active');

                // Se for Carro/Moto, atualizar a lista correspondente
                var wrapperId = selectorTargetMap[target.getAttribute('data-target')];
                if (wrapperId) {
                    var selector = vehicleSelectors[wrapperId];
                    selector.type = target.getAttribute('data-val');
                    document.getElementById(selector.labelId).textContent = '🔍 Buscar veículo';
                    document.getElementById(selector.typeInputId).value = selector.type;
                    document.getElementById(selector.brandInputId).value = '';
                    renderBrandList(wrapperId);
                }
            }
            e.stopPropagation();
            return;
        }

        // 2. ABRIR DROPDOWN DE MARCAS
        if (target.closest('.search-dropdown-btn')) {
            var btn = target.closest('.search-dropdown-btn');
            var panelId = btn.getAttribute('data-panel');
            var panel = document.getElementById(panelId);
            if (panel) {
                var isOpen = panel.classList.contains('open');
                document.getElementById('dropdownPanelVis').classList.remove('open');
                document.getElementById('dropdownPanelMor').classList.remove('open');
                document.getElementById('dropdownPanelVisAcomp').classList.remove('open');
                document.getElementById('dropdownPanelMorAcomp').classList.remove('open');
                if (!isOpen) {
                    panel.classList.add('open');
                    var wrapperId = panelToWrapper[panelId];
                    renderBrandList(wrapperId);
                    var input = panel.querySelector('.search-input-box');
                    if (input) { input.value = ''; input.focus(); }
                }
            }
            e.stopPropagation();
            return;
        }

        // 3. SELECIONAR MARCA DA LISTA
        if (target.classList.contains('brand-item') && target.getAttribute('data-brand')) {
            var brandName = target.getAttribute('data-brand');
            var labelId = target.getAttribute('data-label');
            var panelId = target.getAttribute('data-panel');
            document.getElementById(labelId).textContent = '✔️ ' + brandName;
            document.getElementById(panelId).classList.remove('open');
            var wrapperId = panelToWrapper[panelId];
            if (wrapperId) document.getElementById(vehicleSelectors[wrapperId].brandInputId).value = brandName;
            e.stopPropagation();
            return;
        }

        // 4. FOTO / WEBCAM
        if (target.id === 'photoBox' || target.closest('#photoBox')) { startWebcam(); return; }
        if (target.id === 'btnCapture') { takeSnapshot(); return; }
        if (target.id === 'btnFilePhysical') { document.getElementById('fileUploader').click(); return; }
        if (target.id === 'btnCloseWebcam') { stopWebcam(); return; }
        if (target.id === 'btnRemovePhoto') { resetPhoto(); return; }
        if (target.id === 'btnRetakePhoto') { startWebcam(); return; }

        // 5. CANCELAR / SALVAR
        var target = e.target;
        if (target.id === 'btnCancelar' || target.closest('#btnCancelar')) { closeModal(); return; }
        
        var btnSalvar = target.closest('#btnSalvar');
        if (btnSalvar || target.id === 'btnSalvar') {
            try {
                var isMorador = document.getElementById('sectionMorador').classList.contains('active');
                var formId = isMorador ? 'form-morador' : 'form-visitante';
                
                // 1. O FormManager extrai todos os dados via data-field
                var dto = window.formManager.serialize(formId);
                
                // Tratamento de compatibilidade visual (Legacy Render)
                var state = window.appStore ? window.appStore.getState('visitors') : null;
                var currentDia = state ? state.diaAtivo : 'segunda';
                
                dto.modulo = 'residencial';
                dto.dia = currentDia;
                dto.hora = new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            
                var baseType = isMorador ? 'Morador' : (dto.tipoAcesso || 'Visitante (Pessoal)');
                dto.tipo = baseType + (dto.doc ? ' ('+dto.doc+')' : '') + (isMorador && dto.parentesco ? ' - '+dto.parentesco : '');
                
                var brandLabel = isMorador ? document.getElementById('labelDropdownMor').innerText : document.getElementById('labelDropdownVis').innerText;
                var brandStr = brandLabel.replace('✔️ ', '').replace('🔍 Buscar veículo', 'Sem Veículo');
                dto.placaFinal = dto.placa ? dto.placa + (dto.cor ? ' - ' + dto.cor : '') + ' (' + brandStr + ')' : 'Sem veículo';
                
                var brandLabelAcomp = isMorador ? document.getElementById('labelDropdownMorAcomp').innerText : document.getElementById('labelDropdownVisAcomp').innerText;
                var brandStrAcomp = brandLabelAcomp.replace('✔️ ', '').replace('🔍 Buscar veículo', 'Sem Veículo');
                dto.placaAcompanhante = dto.placaAcomp ? dto.placaAcomp + (dto.corAcomp ? ' - ' + dto.corAcomp : '') + ' (' + brandStrAcomp + ')' : '';
                
                dto.historico = dto.observacao || ("Registro adicionado em " + new Date().toLocaleDateString('pt-BR'));
                dto.alerta = 0;
                dto.status = 0;
                
                // Ajusta o DTO final para o padrão da tabela
                var recordToSave = {
                    id: Date.now().toString(),
                    modulo: dto.modulo,
                    dia: dto.dia,
                    hora: dto.hora,
                    nome: dto.nome || "Registro sem nome",
                    unidade: dto.unidade || "Não informada",
                    tipo: dto.tipo,
                    placa: dto.placaFinal,
                    acompanhantes: dto.acompanhantes || "0",
                    placaAcompanhante: dto.placaAcompanhante,
                    historico: dto.historico,
                    alerta: 0,
                    status: 0
                };
    
                // Visitante salvo (só no cadastro de visitante; morador não entra). Documento nunca vai para o cadastro salvo.
                var remember = document.getElementById('svRemember');
                recordToSave.salvar = !isMorador && (!remember || remember.checked);
                if (!isMorador) recordToSave.visitante = { placa: dto.placa || '', cor: dto.cor || '', marca: brandStr === 'Sem Veículo' ? '' : brandStr, tipo: baseType };

                // 2. O ValidationManager valida as regras de negócio puros
                var valResult = window.ValidationManager.validateVisitor(recordToSave);
                if (!valResult.isValid) {
                    alert("Erros de Validação:\n- " + valResult.errors.join("\n- "));
                    return;
                }
    
                // 3. O VisitorRepository cuida do BD e emite os eventos
                window.VisitorRepository.save(recordToSave).then(savedId => {
                    closeModal();
                    window.formManager.clear(formId);
                    if (remember) remember.checked = true;
                    var svNote = document.getElementById('svNote'); if (svNote) { svNote.textContent = ''; svNote.hidden = true; }
                    
                    // Reseta dropdowns e valores serializados para o próximo cadastro.
                    Object.keys(vehicleSelectors).forEach(function(wrapperId) {
                        var selector = vehicleSelectors[wrapperId];
                        selector.type = 'Carro';
                        document.getElementById(selector.labelId).innerText = '🔍 Buscar veículo';
                        document.getElementById(selector.typeInputId).value = 'Carro';
                        document.getElementById(selector.brandInputId).value = '';
                        renderBrandList(wrapperId);
                    });
                    
                    // Recarrega os dados para a UI reativa
                    if (window.renderController) {
                        window.renderController.reloadDailyData(currentDia, 'residencial');
                    }
                }).catch(e => {
                    alert("Falha ao salvar no banco: " + e.message);
                });
            } catch (err) {
                alert("Erro inesperado no salvamento: " + err.message);
            }
            return;
        }
    });

    // Função exposta para a IA preencher o modal de cadastro (Residencial)
    window.fillFormWithAI = function(data) {
        if (!data) return;
        var isMorador = document.getElementById('sectionMorador').classList.contains('active');
        var formId = isMorador ? 'form-morador' : 'form-visitante';
        
        document.getElementById('mainModalOverlay').setAttribute('open', '');
        
        // 4. Delegação total do preenchimento para o FormManager (Desacoplamento UI/IA)
        window.formManager.fill(formId, data);
    };

    // Filtrar marcas ao digitar
    document.querySelectorAll('.search-input-box').forEach(function(input) {
        input.addEventListener('input', function() {
            var wrapperId = this.getAttribute('data-list');
            renderBrandList(wrapperId, this.value);
        });
    });

    // Fechar dropdowns ao clicar fora
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-dropdown-wrapper')) {
            Object.keys(panelToWrapper).forEach(function(panelId) {
                var panel = document.getElementById(panelId);
                if (panel) panel.classList.remove('open');
            });
        }
    });

    // ==================================================
    // ABRIR / FECHAR MODAL
    // ==================================================
    document.getElementById('btnOpenModal').addEventListener('click', function() {
        document.getElementById('mainModalOverlay').setAttribute('open', '');
    });

    function closeModal() {
        document.getElementById('mainModalOverlay').removeAttribute('open');
        stopWebcam();
    }

    // O Web Component emite evento 'close' quando o overlay (fora do modal) é clicado
    document.getElementById('mainModalOverlay').addEventListener('close', function(e) {
        closeModal();
    });

    // ==================================================
    // CÂMERA / WEBCAM
    // ==================================================
    var videoStream = null;

    function startWebcam() {
        document.getElementById('snapshotContainer').style.display = 'none';
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
            .then(function(stream) {
                videoStream = stream;
                document.getElementById('webcamVideo').srcObject = stream;
                document.getElementById('photoBox').style.display = 'none';
                document.getElementById('webcamContainer').style.display = 'block';
            })
            .catch(function() {
                document.getElementById('fileUploader').click();
            });
    }

    function stopWebcam() {
        if (videoStream) { videoStream.getTracks().forEach(function(t) { t.stop(); }); videoStream = null; }
        document.getElementById('webcamContainer').style.display = 'none';
        if (window.getComputedStyle(document.getElementById('snapshotContainer')).display === 'none') {
            document.getElementById('photoBox').style.display = 'block';
        }
    }

    function takeSnapshot() {
        var video = document.getElementById('webcamVideo');
        var c = document.createElement('canvas');
        c.width = video.videoWidth || 640; c.height = video.videoHeight || 480;
        c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
        document.getElementById('snapshotImage').src = c.toDataURL('image/jpeg');
        stopWebcam();
        document.getElementById('snapshotContainer').style.display = 'block';
        document.getElementById('photoBox').style.display = 'none';
    }

    document.getElementById('fileUploader').addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (file) {
            var reader = new FileReader();
            reader.onload = function(ev) {
                document.getElementById('snapshotImage').src = ev.target.result;
                document.getElementById('photoBox').style.display = 'none';
                document.getElementById('webcamContainer').style.display = 'none';
                document.getElementById('snapshotContainer').style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    function resetPhoto() {
        document.getElementById('snapshotImage').src = '';
        document.getElementById('snapshotContainer').style.display = 'none';
        document.getElementById('photoBox').style.display = 'block';
        document.getElementById('fileUploader').value = '';
    }

    // ==================================================
    // DADOS E AGENDA (RESIDENCIAL) - REATIVIDADE FASE 4
    // ==================================================
    
    // O banco de dados agora é gerenciado pelo VisitorRepository (Fase 2)
    // O estado visual é gerenciado pelo AppStore (Fase 1 e 4)
    // A renderização é orquestrada pelo RenderController (Fase 4)
    
    var diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    var diaAtual = window.KomodoDate ? window.KomodoDate.todayKey() : diasSemana[new Date().getDay()];
    // diaAtivo fica agora encapsulado na Store, usamos apenas para inicializar
    
    // A função saveDB e carregarBanco foram substituídas pelo VisitorRepository

    
    document.addEventListener('DOMContentLoaded', function() {
        var tabAtual = document.querySelector('.tab[data-dia="' + diaAtual + '"]');
        if(tabAtual) {
            var allTabs = document.querySelectorAll('.tab');
            for(var i=0; i<allTabs.length; i++) allTabs[i].classList.remove('active');
            tabAtual.classList.add('active');
        }
        // Inicializa a carga diária via Controller Reativo (Fase 4)
        if (window.renderController) {
            window.renderController.reloadDailyData(diaAtual);
        }
    });

    // Abas de dias
    document.getElementById('tabs').addEventListener('click', function(e) {
        var tab = e.target.closest('.tab');
        if (!tab) return;
        var newDia = tab.getAttribute('data-dia');
        var all = this.querySelectorAll('.tab');
        for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
        tab.classList.add('active');
        
        // Pede pro controller atualizar o estado e recarregar dados do BD
        if (window.renderController) {
            window.renderController.reloadDailyData(newDia);
        }
        document.getElementById('globalSearch').value = '';
    });

    // Expõe a função global para manter compatibilidade com o RenderController
    window.renderDaily = function(data, searchTerm, showAll) {
        var container = document.getElementById('cardsContainer');
        if (!container) return;
        container.replaceChildren();
        searchTerm = String(searchTerm || '');

        var state = window.appStore ? window.appStore.getState('visitors') : null;
        var currentDia = state ? state.diaAtivo : diaAtual;
        var filtered = (searchTerm || showAll) ? data.slice() : data.filter(function(item) { return item.dia === currentDia; });
        if (!filtered.length) {
            var empty = document.createElement('h3');
            empty.className = 'empty-records-message';
            empty.textContent = 'Nenhum registro para este período.';
            container.appendChild(empty);
            return;
        }

        filtered.sort(function(a, b) { return String(a.hora || '').localeCompare(String(b.hora || '')); });

        function appendHighlighted(parent, value) {
            var source = String(value == null ? '' : value);
            var query = searchTerm.toLocaleLowerCase();
            if (!query) {
                parent.appendChild(document.createTextNode(source));
                return;
            }
            var lower = source.toLocaleLowerCase();
            var cursor = 0;
            var matchAt;
            while ((matchAt = lower.indexOf(query, cursor)) !== -1) {
                if (matchAt > cursor) parent.appendChild(document.createTextNode(source.slice(cursor, matchAt)));
                var mark = document.createElement('span');
                mark.className = 'highlight';
                mark.textContent = source.slice(matchAt, matchAt + query.length);
                parent.appendChild(mark);
                cursor = matchAt + query.length;
            }
            if (cursor < source.length) parent.appendChild(document.createTextNode(source.slice(cursor)));
        }

        function addInfoRow(card, prefix, value, className) {
            var row = document.createElement('div');
            row.className = className || 'info-row';
            row.appendChild(document.createTextNode(prefix));
            appendHighlighted(row, value);
            card.appendChild(row);
            return row;
        }

        filtered.forEach(function(item) {
            var isMorador = !!(item.tipo && String(item.tipo).toLowerCase().indexOf('morador') !== -1);
            var card = document.createElement('div');
            card.className = item.alerta ? 'card alerta' : 'card';
            if ('residencial' === 'residencial') {
                card.className = item.alerta ? 'card alerta' : (isMorador ? 'card morador' : 'card visitante');
            }
            card.dataset.id = String(item.id == null ? '' : item.id);

            var deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'btn-delete-card';
            deleteButton.dataset.delid = String(item.id == null ? '' : item.id);
            deleteButton.title = 'Excluir registro';
            deleteButton.textContent = '🗑️';
            card.appendChild(deleteButton);

            // UX fase 2: estado visível + próxima ação em 1 toque (VisitStatus.js)
            var statusBox = document.createElement('div');
            statusBox.className = 'status-box';
            statusBox.appendChild(window.VisitStatus.badge(item.status));
            var nextBtn = window.VisitStatus.actionButton(item);
            if (nextBtn) statusBox.appendChild(nextBtn);
            card.appendChild(statusBox);

            var header = document.createElement('div');
            header.className = 'card-header-inline';
            var time = document.createElement('span');
            time.className = 'time';
            time.appendChild(document.createTextNode('⏰ '));
            appendHighlighted(time, item.hora);
            header.appendChild(time);
            var name = document.createElement('span');
            name.className = 'name';
            appendHighlighted(name, item.nome);
            if (searchTerm || showAll) {
                var extra = document.createElement('span');
                extra.className = 'record-day-extra';
                extra.textContent = ' (' + (('residencial' === 'residencial') ? String(item.dia || '').toUpperCase() + (item.data ? ' ' + String(item.data).split('-').reverse().join('/') : '') : 'Agendado p/ ' + String(item.dia || '').toUpperCase() + (item.data ? ' ' + String(item.data).split('-').reverse().join('/') : '')) + ')';
                name.appendChild(extra);
            }
            header.appendChild(name);
            if ('residencial' === 'residencial') {
                var unit = document.createElement('span');
                unit.className = 'unit-badge';
                unit.appendChild(document.createTextNode('🏠 '));
                appendHighlighted(unit, item.unidade);
                header.appendChild(unit);
            }
            card.appendChild(header);

            if ('residencial' === 'residencial') {
                var typeText = '👤 Tipo: ' + String(item.tipo == null ? '' : item.tipo);
                var typeRow = document.createElement('div');
                typeRow.className = 'info-row';
                typeRow.appendChild(document.createTextNode('👤 Tipo: '));
                appendHighlighted(typeRow, item.tipo);
                if (isMorador && item.parentesco) {
                    typeRow.appendChild(document.createTextNode(' (' + String(item.parentesco) + ')'));
                }
                card.appendChild(typeRow);
                addInfoRow(card, '🚗 Placa Titular: ', item.placa);
            } else {
                addInfoRow(card, '🚗 Veículo Titular: ', item.placa);
            }

            if (item.acompanhantes && item.acompanhantes !== '0' && item.acompanhantes !== '-') {
                var companions = document.createElement('div');
                companions.className = 'info-row';
                companions.style.marginTop = '5px';
                companions.appendChild(document.createTextNode('👤 Acompanhantes: '));
                var count = document.createElement('span');
                count.className = 'companion-count';
                count.textContent = String(item.acompanhantes);
                companions.appendChild(count);
                card.appendChild(companions);
            }
            if (item.placaAcompanhante) {
                var companionPlate = document.createElement('div');
                companionPlate.className = 'info-row companion-vehicle';
                companionPlate.appendChild(document.createTextNode('🚗 Veículo Acompanhante: '));
                appendHighlighted(companionPlate, item.placaAcompanhante);
                card.appendChild(companionPlate);
            }

            var history = document.createElement('div');
            history.className = item.alerta ? 'history-box bad' : 'history-box';
            var historyLabel = document.createElement('strong');
            historyLabel.textContent = 'Histórico:';
            history.appendChild(historyLabel);
            history.appendChild(document.createTextNode(' '));
            appendHighlighted(history, item.historico);
            card.appendChild(history);
            container.appendChild(card);
        });
    }
    // Excluir registro ou alternar status no Card
    document.getElementById('cardsContainer').addEventListener('click', async function(e) {
        var state = window.appStore ? window.appStore.getState('visitors') : null;
        if (!state) return;

        var btnDel = e.target.closest('.btn-delete-card');
        if (btnDel) {
            var regId = btnDel.getAttribute('data-delid');
            var reg = state.dailyData.find(r => r.id === regId);
            if (!reg) return;
            if (!confirm('Tem certeza que deseja excluir "' + reg.nome + '"?')) return;
            
            var card = btnDel.closest('.card');
            card.classList.add('removing');
            
            try {
                await window.VisitorRepository.delete(reg.id);
                if (window.renderController) window.renderController.reloadDailyData(state.diaAtivo, 'residencial');
            } catch(ex) {
                alert("Erro ao deletar: " + ex.message);
                card.classList.remove('removing');
            }
            return;
        }

        var btnStatus = e.target.closest('.btn-status-toggle');
        if (btnStatus) {
            var regId = btnStatus.getAttribute('data-id');
            var reg = state.dailyData.find(r => String(r.id) === regId);
            if (reg && !btnStatus.disabled) {
                await window.VisitStatus.advance(reg, window.VisitorRepository, async function () { if (window.renderController) await window.renderController.reloadDailyData(state.diaAtivo, 'residencial'); }, btnStatus);
            }
        }
    });

    // Busca global (filtra em cima do store)
    document.getElementById('globalSearch').addEventListener('input', function() {
        var state = window.appStore ? window.appStore.getState('visitors') : null;
        if (!state) return;
        var term = this.value.toLowerCase().trim();
        if (term) {
            var all = document.querySelectorAll('.tab');
            for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
            var filtered = state.dailyData.filter(function(item) {
                return Object.values(item).some(function(v) { return String(v).toLowerCase().indexOf(term) !== -1; });
            });
            window.renderDaily(filtered, term);
        } else {
            var tabs = document.querySelectorAll('.tab');
            for (var i = 0; i < tabs.length; i++) { if (tabs[i].getAttribute('data-dia') === state.diaAtivo) tabs[i].classList.add('active'); }
            window.renderDaily(state.dailyData);
        }
    });

    // Agendamento rápido: reaproveita um cadastro já existente sem expor dados no HTML.
    var quickInput = document.getElementById('quickInput');
    var quickDropdown = document.getElementById('quickDropdown');
    var quickAddModule = document.getElementById('quickAddModule');
    var quickRecords = [];
    var quickRequestVersion = 0;

    function closeQuickSuggestions() {
        quickAddModule.classList.remove('active');
        quickDropdown.replaceChildren();
    }

    function showQuickSuggestions(records) {
        quickDropdown.replaceChildren();
        if (!records.length) {
            var empty = document.createElement('div');
            empty.className = 'auto-item';
            empty.textContent = 'Nenhum cadastro encontrado. Use “Morador e visita” para criar um novo registro.';
            quickDropdown.appendChild(empty);
        } else {
            records.slice(0, 6).forEach(function(record, index) {
                var item = document.createElement('button');
                item.type = 'button';
                item.className = 'auto-item';
                item.dataset.quickIndex = index;

                var name = document.createElement('span');
                name.className = 'auto-name';
                name.textContent = record.nome || 'Sem nome';
                var details = document.createElement('span');
                details.className = 'auto-doc';
                details.textContent = (record.tipo || 'Visitante') + ' · ' + (record.unidade || 'Unidade não informada');
                item.append(name, details);
                quickDropdown.appendChild(item);
            });
        }
        quickAddModule.classList.add('active');
    }

    // Sugestão de visitantes salvos (servidor, por empresa). Sem conta online/sem rede: usa os registros já carregados, como antes.
    function quickFallback(term) {
        term = String(term || '').toLocaleLowerCase('pt-BR');
        var requestVersion = ++quickRequestVersion;
        return window.VisitorRepository.getAllByModule('residencial').then(function(allRecords) {
            if (requestVersion !== quickRequestVersion) return [];
            var uniqueByName = {};
            allRecords.forEach(function(record) {
                var name = String(record.nome || '').toLocaleLowerCase('pt-BR');
                if (name.indexOf(term) !== -1 && !uniqueByName[name]) uniqueByName[name] = record;
            });
            quickRecords = Object.keys(uniqueByName).map(function(key) { return uniqueByName[key]; });
            return quickRecords.map(function(r) { return { nome: r.nome, tipo: r.tipo, unidade: r.unidade, visits_count: 0, _visit: r }; });
        });
    }
    var quickSaved = null;
    function wireSaved() {
        if (!window.KacSavedVisitors || quickSaved) return;
        quickSaved = window.KacSavedVisitors.attach(quickInput, { modulo: 'residencial', listbox: quickDropdown, host: quickAddModule, fallback: quickFallback,
            emptyText: 'Nenhum visitante salvo com esse nome. Use “Morador e visita” para o primeiro cadastro.' });
        var nomeVis = document.getElementById('resF1');
        var note = document.getElementById('svNote');
        window.KacSavedVisitors.attach(nomeVis, { modulo: 'residencial', onPick: function(r) {
            var f = document.getElementById('form-visitante');
            var set = function(field, v) { var i = f && f.querySelector('[data-field="' + field + '"]'); if (i && v) { i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); } };
            set('unidade', r.unidade); set('placa', r.placa); set('cor', r.cor);
            if (r.marca) { var lb = document.getElementById('labelDropdownVis'); if (lb) lb.innerText = '✔️ ' + r.marca; var hm = document.getElementById('hiddenMarcaVeicVis'); if (hm) hm.value = r.marca; }
            if (r.placa) { var det = f && f.querySelector('[data-field="placa"]'); det = det && det.closest('details'); if (det) det.open = true; }
            if (note) { note.textContent = r.observacao ? 'Observação salva: ' + r.observacao : 'Dados do visitante salvo preenchidos. Confira antes de salvar.'; note.hidden = false; }
        } });
    }
    if (window.KacSavedVisitors) wireSaved(); else document.addEventListener('DOMContentLoaded', wireSaved);

    document.addEventListener('click', function(event) {
        if (!quickAddModule.contains(event.target)) closeQuickSuggestions();
    });

    document.getElementById('btnQuickAdd').addEventListener('click', async function() {
        var name = quickInput.value.trim();
        var time = document.getElementById('quickTime').value || '00:00';
        if (!name) { alert('Digite ou selecione o nome da pessoa.'); return; }

        var saved = quickSaved ? quickSaved.picked() : null;
        if (saved && saved._visit) saved = null;
        var source = saved ? { nome: saved.nome, unidade: saved.unidade || '', tipo: saved.tipo || 'Visitante', placa: window.KacSavedVisitors.composePlaca(saved) } : quickRecords.find(function(record) {
            return String(record.nome || '').toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR');
        });
        if (source && saved && !source.unidade) {
            document.getElementById('mainModalOverlay').setAttribute('open', '');
            document.querySelector('#form-visitante [data-field="nome"]').value = name;
            alert('Informe a unidade de destino para concluir o agendamento.');
            return;
        }
        if (!source) {
            document.getElementById('mainModalOverlay').setAttribute('open', '');
            document.querySelector('#form-visitante [data-field="nome"]').value = name;
            alert('Complete o cadastro antes de criar um agendamento rápido.');
            return;
        }

        var state = window.appStore.getState('visitors');
        var recordToSave = {
            id: Date.now().toString(), modulo: 'residencial', dia: state.diaAtivo, hora: time,
            nome: source.nome, unidade: source.unidade, tipo: source.tipo, placa: source.placa,
            acompanhantes: source.acompanhantes || '0', placaAcompanhante: source.placaAcompanhante || '',
            historico: saved && saved.observacao ? saved.observacao : 'Agendamento rápido criado em ' + new Date().toLocaleDateString('pt-BR'),
            alerta: source.alerta ? 1 : 0, status: 0
        };
        if (saved) recordToSave.visitante = { placa: saved.placa || '', cor: saved.cor || '', marca: saved.marca || '', tipo: saved.tipo || '' };
        try {
            await window.VisitorRepository.save(recordToSave);
            quickInput.value = '';
            if (quickSaved) quickSaved.clear();
            closeQuickSuggestions();
            if (window.renderController) await window.renderController.reloadDailyData(state.diaAtivo, 'residencial');
        } catch (error) {
            alert('Não foi possível criar o agendamento: ' + error.message);
        }
    });

    // Init
    Object.keys(vehicleSelectors).forEach(function(wrapperId) { renderBrandList(wrapperId); });

    // ==================================================
    // FASE 5: EXPORTAÇÃO PDF, DASHBOARD, OCR & IA
    // ==================================================
    
    // OCR Inteligente Desacoplado (Fase 5)
    async function handleAutoFillAI(isWebcam) {
        var base64Image = '';
        if (isWebcam) {
            var video = document.getElementById('webcamVideo');
            if (!video) return;
            var c = document.createElement('canvas');
            c.width = video.videoWidth || 640; c.height = video.videoHeight || 480;
            c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
            base64Image = c.toDataURL('image/jpeg').split(',')[1];
        } else {
            var imgEl = document.getElementById('snapshotImage');
            if (!imgEl || !imgEl.src) return;
            base64Image = imgEl.src.split(',')[1];
        }
        
        var btn = isWebcam ? document.getElementById('btnOcrPlaca') : document.getElementById('btnOcrPlacaFile');
        if (!btn) return;
        
        var origText = btn.innerText;
        btn.innerText = "⏳ Analisando IA...";
        btn.disabled = true;

        try {
            // O OcrService usa a AiProviderFactory internamente
            if (window.ocrService) {
                await window.ocrService.processImage(base64Image);
                if(isWebcam && typeof takeSnapshot === 'function') takeSnapshot();
            } else {
                alert("OcrService indisponível.");
            }
        } finally {
            btn.innerText = origText;
            btn.disabled = false;
        }
    }

    var btnOcrPlaca = document.getElementById('btnOcrPlaca');
    if (btnOcrPlaca) btnOcrPlaca.addEventListener('click', function() { handleAutoFillAI(true); });
    
    var btnOcrPlacaFile = document.getElementById('btnOcrPlacaFile');
    if (btnOcrPlacaFile) btnOcrPlacaFile.addEventListener('click', function() { handleAutoFillAI(false); });

    // PDF Desacoplado (Fase 5)
    document.getElementById('btnExportPDF').addEventListener('click', async function() {
        // UX fase 1: jsPDF só é baixado agora (não no carregamento da agenda).
        try { if (window.KacVendor) await window.KacVendor.pdf(); } catch (e) { alert('Não foi possível carregar o módulo de PDF. Verifique a conexão.'); return; }
        if(typeof window.PdfExportService !== 'undefined') {
            const state = window.appStore ? window.appStore.getState('visitors') : null;
            const dailyData = state ? state.dailyData : [];
            const diaAtivo = state ? state.diaAtivo : 'qui';
            window.PdfExportService.exportTurnReport(dailyData, diaAtivo, "RESIDENCIAL");
        } else {
            alert("Módulo de PDF não carregado.");
        }
    });

    // Dashboard Desacoplado (Fase 5)
    document.getElementById('btnOpenDashboard').addEventListener('click', function() {
        if(window.dashboardManager) {
            window.dashboardManager.openDashboard();
        }
    });
    // Config IA
    document.getElementById('btnOpenConfig').addEventListener('click', function() {
        document.getElementById('configAiProvider').value = 'groq';
        document.getElementById('configApiKey').value = '';
        document.getElementById('configModalOverlay').style.display = 'flex';
    });
    document.getElementById('btnSaveConfig').addEventListener('click', function() {
        document.getElementById('configModalOverlay').style.display = 'none';
        alert('A IA usa configuração segura no servidor. Nenhuma chave é armazenada neste dispositivo.');
    });

    // Chat IA
    document.getElementById('btnToggleAi').addEventListener('click', function() {
        var panel = document.getElementById('aiPanel');
        panel.classList.toggle('open');
        if (panel.classList.contains('open')) {
            document.getElementById('chat-input').focus();
        }
    });
    document.getElementById('btnCloseAi').addEventListener('click', function() { document.getElementById('btnToggleAi').click(); });
    
    document.getElementById('btnSendAi').addEventListener('click', function() {
        if (window.komodoCopilot) {
            window.komodoCopilot.sendChatMessage();
        }
    });
    
    var btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (window.authService) {
                window.authService.logout();
                window.location.href = 'login.html';
            }
        });
    }
    
    document.getElementById('chat-input').addEventListener('keypress', function(e) { if(e.key === 'Enter') document.getElementById('btnSendAi').click(); });

    
;
/* cordova.js */
/* Stub vazio para a versão web: o app Android (Capacitor/Cordova) substitui este arquivo no build. Evita 404 no navegador. */

;
/* src/core/Events.js */
/**
 * Events.js
 * 
 * Dicionário centralizado de Eventos do Sistema Guardião Komodo.
 * Elimina o uso de "Magic Strings" espalhadas pelo código.
 */

const SystemEvents = {
    // Eventos de UI
    UI_READY: 'UI_READY',
    UI_TAB_CHANGED: 'UI_TAB_CHANGED',
    UI_SAVE_CLICKED: 'UI_SAVE_CLICKED',
    
    // Eventos de Formulário
    FORM_DATA_EXTRACTED: 'FORM_DATA_EXTRACTED',
    FORM_VALIDATION_FAILED: 'FORM_VALIDATION_FAILED',
    FORM_VALIDATION_PASSED: 'FORM_VALIDATION_PASSED',
    FORM_CLEARED: 'FORM_CLEARED',
    
    // Eventos Cognitivos (IA)
    AI_FORM_FILL_REQUESTED: 'AI_FORM_FILL_REQUESTED',
    AI_CAPTURE_STARTED: 'AI_CAPTURE_STARTED',
    AI_ERROR: 'AI_ERROR',
    
    // Eventos de Domínio e Persistência
    DB_SAVE_REQUESTED: 'DB_SAVE_REQUESTED',
    DB_SAVE_SUCCESS: 'DB_SAVE_SUCCESS',
    DB_ERROR: 'DB_ERROR'
};

window.SystemEvents = SystemEvents;

;
/* src/core/EventBus.js */
/**
 * EventBus.js
 * 
 * Barramento central de comunicação da arquitetura desacoplada (Pub/Sub).
 * Nenhum módulo deve invocar funções de outro módulo diretamente.
 */

class EventBus {
    constructor() {
        this.listeners = {};
        this.history = []; // Para debug e observabilidade
    }

    /**
     * Inscreve um callback para escutar um evento específico.
     * @param {string} eventName - Nome do evento (usar SystemEvents.*)
     * @param {Function} callback - Função executada quando o evento ocorre
     */
    on(eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);
    }

    /**
     * Remove a inscrição de um callback.
     */
    off(eventName, callback) {
        if (!this.listeners[eventName]) return;
        this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
    }

    /**
     * Dispara um evento para todos os ouvintes inscritos.
     * @param {string} eventName - Nome do evento
     * @param {any} payload - Dados trafegados
     */
    emit(eventName, payload = null) {
        this.history.push({ event: eventName, time: new Date().getTime(), payload });
        
        // Debugging mode (Pode ser desligado em produção)
        console.log(`[EventBus] 🚀 Emitido: ${eventName}`, payload || '');

        if (!this.listeners[eventName]) {
            console.warn(`[EventBus] Nenhum listener para o evento: ${eventName}`);
            return;
        }

        this.listeners[eventName].forEach(callback => {
            try {
                callback(payload);
            } catch (error) {
                console.error(`[EventBus] Erro ao processar evento ${eventName}:`, error);
            }
        });
    }

    // Auxiliar para telemetria/debugging
    getHistory() {
        return this.history;
    }
}

window.eventBus = new EventBus();

;
/* src/core/AppStore.js */
/**
 * AppStore.js
 * 
 * Gerenciador Modular de Estado Local.
 * Atua como a Single Source of Truth do frontend.
 * Notifica automaticamente as mudanças de estado pelo EventBus.
 */

class AppStore {
    constructor() {
        // Separação por Domínios (Módulos)
        this.state = {
            ui: {
                activeTab: 'visitante',
                isLoading: false
            },
            auth: {
                currentUser: null
            },
            form: {
                currentData: {}
            },
            visitors: {
                diaAtivo: (window.KomodoDate ? window.KomodoDate.todayKey() : 'seg'),
                dailyData: []
            }
        };
    }

    /**
     * Obtém uma cópia readonly do estado global ou de um domínio específico.
     */
    getState(domain = null) {
        const copy = JSON.parse(JSON.stringify(this.state));
        return domain ? copy[domain] : copy;
    }

    /**
     * Mutação segura do estado de UI.
     */
    setUiState(partialState) {
        this.state.ui = { ...this.state.ui, ...partialState };
        window.eventBus.emit('STORE_UI_UPDATED', this.state.ui);
    }

    /**
     * Mutação segura do estado de Formulários.
     */
    setFormState(partialState) {
        this.state.form = { ...this.state.form, ...partialState };
        window.eventBus.emit('STORE_FORM_UPDATED', this.state.form);
    }

    /**
     * Mutação segura do estado de Autenticação.
     */
    setAuthState(partialState) {
        this.state.auth = { ...this.state.auth, ...partialState };
        window.eventBus.emit('STORE_AUTH_UPDATED', this.state.auth);
    }

    /**
     * Mutação segura do estado de Visitantes (Substitui as variáveis globais).
     */
    setVisitorsState(partialState) {
        this.state.visitors = { ...this.state.visitors, ...partialState };
        window.eventBus.emit('STORE_VISITORS_UPDATED', this.state.visitors);
    }
}

window.appStore = new AppStore();

;
/* src/services/ValidationManager.js */
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

;
/* src/services/adapters/AiProviderAdapter.js */
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

;
/* src/services/ApiService.js */
﻿/**
 * ApiService — API local do backend.
 * As rotas protegidas recebem o token de sessão emitido pelo servidor.
 */
class ApiService {
  constructor() {
    this.baseUrl = '/api';
  }

  _headers(extra = {}) {
    return { ...extra };
  }

  async _request(method, endpoint, payload) {
    const options = { method, headers: this._headers(), credentials: 'same-origin' };
    if (payload !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload);
    }
    let response;
    try {
      // Falha rápida (12 s) em rede ruim em vez de travar a tela.
      const ctl = typeof AbortController === 'function' ? new AbortController() : null; const tm = ctl ? setTimeout(() => ctl.abort(), 12000) : null; if (ctl) options.signal = ctl.signal;
      try { response = await fetch(this.baseUrl + endpoint, options); } finally { if (tm) clearTimeout(tm); }
    } catch {
      const e = new Error('Não foi possível conectar ao serviço local. Verifique se ele está iniciado.'); e.network = true; throw e;
    }
    if (response.status === 204) return null;
    let data;
    try { data = await response.json(); }
    catch { throw new Error('O serviço retornou uma resposta inválida.'); }
    if (!response.ok || data?.success !== true) {
      const message = data?.message || (response.status === 401 ? 'Sessão expirada. Entre novamente.' : 'Não foi possível concluir a operação.');
      if (response.status === 401 && !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/bootstrap')) {
        try { sessionStorage.removeItem('komodo_session'); } catch {}
      }
      const err = new Error(message); err.status = response.status; if (data?.code) err.code = data.code; throw err;
    }
    return data.data;
  }

  get(endpoint) { return this._request('GET', endpoint); }
  post(endpoint, payload) { return this._request('POST', endpoint, payload); }
  put(endpoint, payload) { return this._request('PUT', endpoint, payload); }
  delete(endpoint) { return this._request('DELETE', endpoint); }
}
window.apiService = new ApiService();


;
/* src/ui/ConnectionMonitor.js */
/**
 * Indicador de disponibilidade da API.
 * Mantém o operador informado quando a conexão local é interrompida.
 */
(function () {
    const healthUrl = '/api/health';

    function updateStatus(state, message) {
        const indicator = document.getElementById('apiStatus');
        if (!indicator) return;
        indicator.className = `api-status ${state}`;
        indicator.textContent = message;
        indicator.setAttribute('aria-label', message);
    }

    async function checkConnection() {
        if (!navigator.onLine) {
            updateStatus('offline', 'Sem conexão');
            return false;
        }
        try {
            const response = await fetch(healthUrl, { cache: 'no-store' });
            const payload = await response.json();
            if (!response.ok || !payload.success || payload.data.status !== 'online') throw new Error('API indisponível');
            updateStatus('online', 'Sistema online');
            return true;
        } catch (error) {
            updateStatus('offline', 'Servidor indisponível');
            return false;
        }
    }

    window.komodoConnection = { check: checkConnection };
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);
    document.addEventListener('DOMContentLoaded', () => {
        checkConnection();
        window.setInterval(checkConnection, 30000);
    });
})();

;
/* src/services/OfflineGate.js */
/**
 * OfflineGate (achado 4) — portaria sem internet.
 * - Guarda a agenda do DIA (só campos mínimos: id, hora, nome, unidade, tipo, placa, status, data) CIFRADA com AES-GCM 256.
 * - Fila cifrada de check-in/check-out feitos sem rede; ao voltar a conexão, envia em ordem com "from" (o servidor recusa
 *   com 409 o que mudou em outro aparelho — nada é sobrescrito às cegas).
 * - A chave é gerada no aparelho, NÃO exportável (CryptoKey no IndexedDB). Tudo expira em 24 h e é apagado no logout.
 * - Nunca guarda acompanhantes, histórico, documentos, tokens ou senha.
 */
(function (root) {
  'use strict';
  var TTL = 24 * 60 * 60 * 1000, FIELDS = ['id', 'hora', 'nome', 'unidade', 'tipo', 'placa', 'status', 'data', 'dia', 'modulo'];
  function idbStore() {
    var dbp = null;
    function open() { if (dbp) return dbp; dbp = new Promise(function (ok, ko) { var r = root.indexedDB.open('kac-offline', 1); r.onupgradeneeded = function () { r.result.createObjectStore('kv'); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { ko(r.error); }; }); return dbp; }
    function tx(mode, fn) { return open().then(function (db) { return new Promise(function (ok, ko) { var t = db.transaction('kv', mode), s = t.objectStore('kv'), out = fn(s); t.oncomplete = function () { ok(out && out.result); }; t.onerror = function () { ko(t.error); }; }); }); }
    return { get: function (k) { return tx('readonly', function (s) { return s.get(k); }); }, set: function (k, v) { return tx('readwrite', function (s) { s.put(v, k); }); },
      del: function (k) { return tx('readwrite', function (s) { s.delete(k); }); }, clear: function () { return tx('readwrite', function (s) { s.clear(); }); } };
  }
  function create(opts) {
    opts = opts || {}; var store = opts.store || idbStore(), subtle = (opts.crypto || root.crypto).subtle, now = opts.now || Date.now, getRandom = function (n) { return (opts.crypto || root.crypto).getRandomValues(new Uint8Array(n)); };
    var enc = new TextEncoder(), dec = new TextDecoder();
    async function key() { var k = await store.get('key'); if (!k) { k = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); await store.set('key', k); } return k; }
    async function seal(obj) { var iv = getRandom(12); var ct = await subtle.encrypt({ name: 'AES-GCM', iv: iv }, await key(), enc.encode(JSON.stringify(obj))); return { iv: Array.from(iv), ct: new Uint8Array(ct), exp: now() + TTL }; }
    async function open(box) { if (!box || box.exp < now()) return null; try { var pt = await subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(box.iv) }, await key(), box.ct); return JSON.parse(dec.decode(pt)); } catch (_) { return null; } }
    function minimal(rows) { return (rows || []).map(function (r) { var o = {}; FIELDS.forEach(function (f) { if (r[f] !== undefined) o[f] = r[f]; }); return o; }); }
    var dayKey = function (m, d) { return 'day:' + m + ':' + d; };
    var api = {
      FIELDS: FIELDS,
      cacheDay: async function (modulo, day, rows) { await store.set(dayKey(modulo, day), await seal(minimal(rows))); },
      readDay: async function (modulo, day) { var b = await store.get(dayKey(modulo, day)); var rows = await open(b); if (!rows && b) await store.del(dayKey(modulo, day)); return rows; },
      patchDay: async function (modulo, day, id, status) { var rows = await api.readDay(modulo, day); if (!rows) return; rows.forEach(function (r) { if (String(r.id) === String(id)) r.status = status; }); await api.cacheDay(modulo, day, rows); },
      queue: async function () { return (await open(await store.get('queue'))) || []; },
      enqueue: async function (op) { var q = await api.queue(); q.push({ id: String(op.id), status: Number(op.status), from: op.from === undefined ? undefined : Number(op.from), at: now() }); await store.set('queue', await seal(q)); return q.length; },
      // send(op) → resolve ok; rejeita com err.status (409 = conflito; sem status = ainda sem rede → para e mantém o resto)
      flush: async function (send) { var q = await api.queue(), sent = 0, conflicts = 0, failed = 0, rest = [];
        for (var i = 0; i < q.length; i++) { try { await send(q[i]); sent++; } catch (e) { if (e && e.status === 409) conflicts++; else if (e && e.status) failed++; else { rest = q.slice(i); break; } } }
        if (rest.length) await store.set('queue', await seal(rest)); else await store.del('queue');
        return { sent: sent, conflicts: conflicts, failed: failed, pending: rest.length }; },
      clear: function () { return store.clear(); }
    };
    return api;
  }
  root.KomodoOffline = { create: create, isNetworkError: function (e) { return !!(e && (e.network === true || (!e.status && /conectar/i.test(String(e.message || ''))))); } };
  if (root.indexedDB && root.crypto && root.crypto.subtle) { try { root.komodoOffline = create(); } catch (_) {} }
  // Aviso discreto (aria-live) quando algo fica na fila ou é sincronizado.
  if (root.addEventListener && root.document) {
    var note = function (t) { var d = root.document, n = d.getElementById('kacOfflineNote'); if (!n) { n = d.createElement('p'); n.id = 'kacOfflineNote'; n.className = 'pwa-offline'; n.setAttribute('role', 'status'); n.setAttribute('aria-live', 'polite'); (d.body || d.documentElement).appendChild(n); } n.textContent = t; n.hidden = false; clearTimeout(note.t); note.t = setTimeout(function () { n.hidden = true; }, 6000); };
    root.addEventListener('kac:offline-queued', function () { note('Sem internet: registro guardado no aparelho. Será enviado quando a conexão voltar.'); });
    root.addEventListener('kac:offline-synced', function (e) { var r = e.detail || {}; note(r.sent + ' registro(s) enviado(s)' + (r.conflicts ? '; ' + r.conflicts + ' já tinha(m) sido alterado(s) em outro aparelho' : '') + '.'); });
  }
})(typeof window !== 'undefined' ? window : globalThis);

;
/* src/db/dao/VisitorRepository.js */
/**
 * Repository de acessos: API autenticada no desktop; SQLite local no Capacitor.
 * Não há fallback silencioso do desktop para localStorage se a API falhar.
 */
class VisitorRepository {
  static _remote() { return Boolean(window.authService?.isRemoteMode()); }
  static async _localQuery(modulo) {
    await window.dbService.init();
    return window.dbService.query('SELECT * FROM komodo_acessos WHERE modulo = ?', [modulo]);
  }

  static _dateFor(dia) {
    const KD = window.KomodoDate; if (!KD || !dia) return null;
    const w = KD.weekDates()[dia]; if (!w) return null;
    return w.year + '-' + String(w.month).padStart(2, '0') + '-' + String(w.day).padStart(2, '0');
  }

  static async save(visitorDTO) {
    let result;
    if (!visitorDTO.data) { const d = this._dateFor(visitorDTO.dia); if (d) visitorDTO = { ...visitorDTO, data: d }; }
    if (this._remote()) {
      if (!window.apiService) throw new Error('ApiService não carregado.');
      result = await window.apiService.post('/visitantes', visitorDTO);
    } else {
      // salvar/visitante só valem para a API (visitantes salvos); não são colunas da tabela local.
      const { salvar, visitante, ...row } = visitorDTO;
      result = await window.dbService.insert('komodo_acessos', row);
    }
    if (window.eventBus && window.SystemEvents) window.eventBus.emit(window.SystemEvents.DB_SAVE_SUCCESS, result);
    return result;
  }

  static async delete(id) {
    if (this._remote()) return window.apiService.delete('/visitantes/' + encodeURIComponent(id));
    await window.dbService.delete('komodo_acessos', id);
    return { id, deleted: true };
  }

  static async reschedule(id, data, hora) {
    if (!this._remote()) throw new Error('Reagendamento disponível apenas no modo online.');
    return window.apiService.put('/visitantes/' + encodeURIComponent(id) + '/reagendar', { data, hora });
  }

  static async history(id) {
    if (!this._remote()) return { data: [] };
    return window.apiService.get('/visitantes/' + encodeURIComponent(id) + '/historico');
  }

  static async updateStatus(id, newStatus, opts = {}) {
    const body = { status: newStatus };
    if (opts.from !== undefined) body.from = opts.from;
    if (opts.undo === true) body.undo = true;
    if (this._remote()) {
      try { return await window.apiService.put('/visitantes/' + encodeURIComponent(id) + '/status', body); }
      catch (e) {
        // Achado 4: sem rede → fila cifrada no aparelho; envia sozinho quando a conexão voltar.
        const off = window.komodoOffline; if (!off || !window.KomodoOffline.isNetworkError(e) || opts.undo === true) throw e;
        await off.enqueue({ id, status: newStatus, from: opts.from });
        const ld = this._lastDay; if (ld) { try { await off.patchDay(ld.modulo, ld.k, id, Number(newStatus)); } catch (_) {} }
        try { window.dispatchEvent(new CustomEvent('kac:offline-queued')); } catch (_) {}
        return { id, status: Number(newStatus), queued: true };
      }
    }
    const status = Number(newStatus);
    if (!Number.isInteger(status) || status < 0 || status > 2) throw new Error('Status inválido.');
    if (opts.from !== undefined) { await window.dbService.init(); const cur = (await window.dbService.query('SELECT status FROM komodo_acessos WHERE id = ?', [id]))[0]; if (cur && Number(cur.status || 0) !== Number(opts.from)) { const e = new Error('Status alterado em outro aparelho.'); e.status = 409; throw e; } }
    await window.dbService.update('komodo_acessos', { id, status });
    return { id, status };
  }

  static async getAllDaily(dateString, modulo = 'residencial') {
    // API web filtra por dia da semana (seg..dom), não por data ISO completa.
    const day = String(dateString || '').trim().toLowerCase();
    const date = this._dateFor(day);
    if (this._remote()) {
      const off = window.komodoOffline, k = day + ':' + (date || '');
      try { const rows = await window.apiService.get('/visitantes/' + encodeURIComponent(modulo) + '/' + encodeURIComponent(day) + (date ? '?data=' + date : ''));
        this._lastDay = { modulo, k };
        if (off) off.cacheDay(modulo, k, Array.isArray(rows) ? rows : (rows?.data || [])).catch(() => {});
        return rows; }
      catch (e) { this._lastDay = { modulo, k }; const cached = off && window.KomodoOffline.isNetworkError(e) ? await off.readDay(modulo, k) : null; if (cached) { cached.offline = true; return cached; } throw e; }
    }
    const rows = await this._localQuery(modulo);
    return rows.filter(row => row.dia === dateString && (!date || !row.data || row.data === date));
  }

  static async getAllByModule(modulo = 'residencial') {
    if (this._remote()) return window.apiService.get('/visitantes/' + encodeURIComponent(modulo));
    return this._localQuery(modulo);
  }

  /** Registros do módulo num intervalo de datas (inclusive). de/ate: 'YYYY-MM-DD' ou null. */
  static async getRange(modulo, de, ate) {
    if (this._remote()) {
      const qs = [de ? 'de=' + de : '', ate ? 'ate=' + ate : ''].filter(Boolean).join('&');
      return window.apiService.get('/visitantes/' + encodeURIComponent(modulo) + (qs ? '?' + qs : ''));
    }
    const rows = await this._localQuery(modulo);
    return rows.filter(r => r.data && (!de || r.data >= de) && (!ate || r.data <= ate))
      .sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || '')));
  }

  static async getIncidentReports(modulo = 'residencial') {
    const allData = await this.getAllByModule(modulo);
    return allData.filter(item => item.alerta === true || item.alerta === 1 || item.alerta === 'true' || item.alerta === '1');
  }
}
window.VisitorRepository = VisitorRepository;

// Achado 4: ao voltar a conexão (e ao abrir o app), envia a fila offline em ordem; conflitos (409) viram aviso, nada é sobrescrito.
if (typeof window !== 'undefined' && window.addEventListener) {
  const kacFlush = async () => { const off = window.komodoOffline; if (!off || !VisitorRepository._remote() || navigator.onLine === false) return;
    try { const r = await off.flush(op => window.apiService.put('/visitantes/' + encodeURIComponent(op.id) + '/status', op.from === undefined ? { status: op.status } : { status: op.status, from: op.from }));
      if (r.sent || r.conflicts || r.failed) window.dispatchEvent(new CustomEvent('kac:offline-synced', { detail: r })); } catch (_) {} };
  window.addEventListener('online', kacFlush); window.addEventListener('load', () => setTimeout(kacFlush, 1500));
}

;
/* src/ui/SavedVisitors.js */
/* Visitantes frequentes (Onda 1, item 1): sugestão de nome ao registrar uma visita, reaproveitar os dados salvos,
   e uma tela para editar/remover visitantes salvos. Dados vêm só de /api/visitantes-salvos (org resolvida no servidor).
   Combobox acessível (ARIA 1.2): setas, Enter, Esc; resultados anunciados numa região polite. DOM só via textContent. */
(function (root) {
  'use strict';
  var doc = root.document;
  var seq = 0;
  function api() { return root.apiService; }
  function remote() { try { return !!(root.authService && root.authService.isRemoteMode && root.authService.isRemoteMode()); } catch (_) { return false; } }
  function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
  function qs(o) { return Object.keys(o).filter(function (k) { return o[k] != null && o[k] !== ''; }).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(o[k]); }).join('&'); }
  var cache = new Map();
  function search(modulo, q) {
    var key = modulo + '|' + String(q || '').toLowerCase();
    if (cache.has(key)) return Promise.resolve(cache.get(key));
    return api().get('/visitantes-salvos?' + qs({ modulo: modulo, q: q })).then(function (rows) { rows = Array.isArray(rows) ? rows : []; cache.set(key, rows); if (cache.size > 40) cache.delete(cache.keys().next().value); return rows; });
  }
  function list(modulo) { return api().get('/visitantes-salvos?' + qs({ modulo: modulo, limit: 200 })).then(function (r) { return Array.isArray(r) ? r : []; }); }
  function update(id, data) { cache.clear(); return api().put('/visitantes-salvos/' + encodeURIComponent(id), data); }
  function remove(id) { cache.clear(); return api().delete('/visitantes-salvos/' + encodeURIComponent(id)); }
  function invalidate() { cache.clear(); }
  // Placa no formato que a agenda já usa: "ABC1D23 - Prata (Fiat)".
  function composePlaca(r) { if (!r || !r.placa) return 'Sem veículo'; return r.placa + (r.cor ? ' - ' + r.cor : '') + ' (' + (r.marca || 'Sem Veículo') + ')'; }
  function details(r) {
    var p = [];
    if (r.tipo) p.push(r.tipo);
    if (r.unidade) p.push(r.unidade);
    p.push(r.placa ? r.placa + (r.cor ? ' ' + r.cor : '') : 'sem veículo');
    var n = Number(r.visits_count) || 0; p.push(n === 1 ? '1 visita' : n + ' visitas');
    return p.join(' · ');
  }

  /* Liga a sugestão a um campo de nome.
     opts: modulo, listbox (elemento onde a lista aparece; criado se ausente), host (elemento que recebe .active; padrão: listbox com .sv-open),
           onPick(registro), fallback(termo) -> Promise<registros> (modo local/sem rede), emptyText */
  function attach(input, opts) {
    if (!input || input.__svAttached) return null; input.__svAttached = true; opts = opts || {};
    var id = 'sv' + (++seq);
    var lb = opts.listbox;
    if (!lb) { lb = el('div', 'sv-list'); input.insertAdjacentElement('afterend', lb); if (input.parentNode) input.parentNode.classList.add('sv-anchor'); }
    lb.id = lb.id || id + '-list'; lb.setAttribute('role', 'listbox'); lb.setAttribute('aria-label', 'Visitantes salvos');
    var live = el('div', 'sv-sr'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); lb.insertAdjacentElement('afterend', live);
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', lb.id); input.setAttribute('autocomplete', 'off');
    var rows = [], active = -1, picked = null, version = 0, timer = null;
    function setOpen(open) { input.setAttribute('aria-expanded', open ? 'true' : 'false'); if (opts.host) opts.host.classList.toggle('active', open); else lb.classList.toggle('sv-open', open); if (!open) { active = -1; input.removeAttribute('aria-activedescendant'); } }
    function close() { setOpen(false); }
    function mark() { Array.prototype.forEach.call(lb.querySelectorAll('[role=option]'), function (o, i) { var on = i === active; o.setAttribute('aria-selected', on ? 'true' : 'false'); o.classList.toggle('sv-active', on); if (on) { input.setAttribute('aria-activedescendant', o.id); if (o.scrollIntoView) o.scrollIntoView({ block: 'nearest' }); } }); }
    function render(term) {
      lb.replaceChildren();
      if (!rows.length) {
        var e = el('div', 'auto-item sv-empty', opts.emptyText || 'Nenhum visitante salvo com esse nome. Ao salvar a visita, os dados ficam guardados para a próxima vez.');
        e.setAttribute('aria-hidden', 'true'); lb.appendChild(e); live.textContent = 'Nenhuma sugestão.';
      } else {
        rows.slice(0, 8).forEach(function (r, i) {
          var o = el('div', 'auto-item sv-opt'); o.id = lb.id + '-o' + i; o.setAttribute('role', 'option'); o.setAttribute('aria-selected', 'false'); o.dataset.svIndex = String(i);
          o.appendChild(el('span', 'auto-name', r.nome || '')); o.appendChild(el('span', 'auto-doc', details(r)));
          lb.appendChild(o);
        });
        live.textContent = rows.length === 1 ? '1 sugestão. Use as setas para escolher.' : Math.min(rows.length, 8) + ' sugestões. Use as setas para escolher.';
      }
      setOpen(true); mark();
    }
    function pick(i) { var r = rows[i]; if (!r) return; picked = r; input.value = r.nome || ''; close(); live.textContent = 'Dados de ' + (r.nome || '') + ' preenchidos.'; if (opts.onPick) { try { opts.onPick(r); } catch (e) { console.error('sugestão:', e); } } }
    function run() {
      var term = input.value.trim(); var my = ++version;
      if (term.length < 2) { rows = []; close(); return; }
      var p = remote() && api() ? search(opts.modulo, term) : (opts.fallback ? opts.fallback(term) : Promise.resolve([]));
      p.catch(function () { return opts.fallback ? opts.fallback(term) : []; }).then(function (r) { if (my !== version) return; rows = Array.isArray(r) ? r : []; render(term); });
    }
    input.addEventListener('input', function () { if (picked && input.value.trim().toLowerCase() !== String(picked.nome || '').toLowerCase()) picked = null; clearTimeout(timer); timer = setTimeout(run, 160); });
    input.addEventListener('keydown', function (e) {
      var open = input.getAttribute('aria-expanded') === 'true'; var n = Math.min(rows.length, 8);
      if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) { run(); return; } if (n) { active = (active + 1) % n; mark(); } }
      else if (e.key === 'ArrowUp') { if (open && n) { e.preventDefault(); active = active <= 0 ? n - 1 : active - 1; mark(); } }
      else if (e.key === 'Enter') { if (open && active >= 0) { e.preventDefault(); pick(active); } }
      else if (e.key === 'Escape') { if (open) { e.preventDefault(); e.stopPropagation(); close(); } }
      else if (e.key === 'Tab') close();
    });
    input.addEventListener('blur', function () { setTimeout(close, 150); });
    // pointerdown evita perder o foco antes do clique (mouse e toque)
    lb.addEventListener('mousedown', function (e) { e.preventDefault(); });
    lb.addEventListener('click', function (e) { var o = e.target.closest('[data-sv-index]'); if (o) pick(Number(o.dataset.svIndex)); });
    return { close: close, picked: function () { return picked && input.value.trim().toLowerCase() === String(picked.nome || '').toLowerCase() ? picked : null; }, clear: function () { picked = null; }, refresh: run };
  }

  /* Tela "Visitantes salvos": lista com busca, editar e remover. <dialog> nativo (foco preso e Esc pelo navegador). */
  var FIELDS = [
    ['nome', 'Nome', 'text', 120, true], ['tipo', 'Tipo', 'text', 40], ['placa', 'Placa', 'text', 10], ['cor', 'Cor do veículo', 'text', 40],
    ['marca', 'Marca do veículo', 'text', 60], ['unidade', 'Destino / unidade', 'text', 120], ['observacao', 'Observação', 'textarea', 300]
  ];
  function openManager(modulo, opener) {
    if (!remote()) { root.alert('Visitantes salvos ficam disponíveis com a conta online.'); return null; }
    var dlg = doc.getElementById('svManager');
    if (dlg) dlg.remove();
    dlg = el('dialog', 'sv-dialog'); dlg.id = 'svManager'; dlg.setAttribute('aria-labelledby', 'svTitle');
    var head = el('div', 'sv-head'); var h = el('h2', 'sv-title', 'Visitantes salvos'); h.id = 'svTitle';
    var x = el('button', 'btn-icon sv-close', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Fechar');
    head.append(h, x);
    var hint = el('p', 'sv-hint', 'Quem já visitou fica salvo aqui para preencher a próxima visita mais rápido. Remover daqui não apaga as visitas já registradas.');
    var sl = el('label', 'sv-label', 'Buscar'); sl.htmlFor = 'svSearch';
    var s = el('input', 'form-control sv-search'); s.id = 'svSearch'; s.type = 'search'; s.placeholder = 'Nome do visitante'; s.autocomplete = 'off';
    var status = el('p', 'sv-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    var ul = el('ul', 'sv-rows'); ul.setAttribute('aria-label', 'Lista de visitantes salvos');
    var body = el('div', 'sv-body'); body.append(hint, sl, s, status, ul);
    dlg.append(head, body); doc.body.appendChild(dlg);
    var all = [];
    function done() { dlg.close(); }
    x.addEventListener('click', done);
    dlg.addEventListener('close', function () { dlg.remove(); var back = opener && opener.offsetParent !== null ? opener : doc.querySelector('.bn-more summary'); if (back && back.focus) back.focus(); });
    function draw() {
      var t = s.value.trim().toLowerCase(); var shown = all.filter(function (r) { return !t || String(r.nome).toLowerCase().indexOf(t) !== -1 || String(r.placa || '').toLowerCase().indexOf(t) !== -1; });
      ul.replaceChildren();
      status.textContent = all.length ? (shown.length === 1 ? '1 visitante' : shown.length + ' visitantes') : 'Nenhum visitante salvo ainda. Eles aparecem aqui depois da primeira visita registrada.';
      shown.forEach(function (r) {
        var li = el('li', 'sv-row'); var info = el('div', 'sv-info'); info.append(el('span', 'auto-name', r.nome), el('span', 'auto-doc', details(r)));
        if (r.observacao) info.appendChild(el('span', 'sv-obs', r.observacao));
        var act = el('div', 'sv-actions');
        var be = el('button', 'btn-outline sv-btn', 'Editar'); be.type = 'button'; be.setAttribute('aria-label', 'Editar ' + r.nome);
        var bd = el('button', 'btn-cancel sv-btn', 'Remover'); bd.type = 'button'; bd.setAttribute('aria-label', 'Remover ' + r.nome + ' dos visitantes salvos');
        be.addEventListener('click', function () { edit(li, r); });
        bd.addEventListener('click', function () {
          if (!root.confirm('Remover ' + r.nome + ' dos visitantes salvos? As visitas já registradas continuam na agenda.')) return;
          bd.disabled = true; remove(r.id).then(function () { all = all.filter(function (y) { return y.id !== r.id; }); draw(); status.textContent = r.nome + ' removido dos visitantes salvos.'; s.focus(); })
            .catch(function (e) { bd.disabled = false; status.textContent = e.message || 'Não foi possível remover agora.'; });
        });
        act.append(be, bd); li.append(info, act); ul.appendChild(li);
      });
    }
    function edit(li, r) {
      var f = el('form', 'sv-form'); f.noValidate = true; f.setAttribute('aria-label', 'Editar ' + r.nome);
      FIELDS.forEach(function (d) {
        if (d[0] === 'unidade' && modulo !== 'residencial' && !r.unidade) return;
        var fid = 'svf-' + d[0]; var lab = el('label', 'sv-label', d[1]); lab.htmlFor = fid;
        var inp = el(d[2] === 'textarea' ? 'textarea' : 'input', 'form-control'); inp.id = fid; inp.name = d[0]; inp.maxLength = d[3]; if (d[2] !== 'textarea') inp.type = 'text';
        if (d[4]) inp.required = true; if (d[0] === 'placa') { inp.setAttribute('autocapitalize', 'characters'); inp.placeholder = 'ABC1D23'; }
        inp.value = r[d[0]] || ''; f.append(lab, inp);
      });
      var err = el('p', 'sv-err'); err.setAttribute('role', 'alert');
      var bar = el('div', 'sv-actions'); var ok = el('button', 'btn-gold sv-btn', 'Salvar'); ok.type = 'submit'; var no = el('button', 'btn-cancel sv-btn', 'Cancelar'); no.type = 'button';
      bar.append(no, ok); f.append(err, bar);
      li.replaceChildren(f); f.querySelector('input').focus();
      no.addEventListener('click', function () { draw(); });
      f.addEventListener('submit', function (e) {
        e.preventDefault(); var data = {}; FIELDS.forEach(function (d) { var i = f.elements[d[0]]; data[d[0]] = i ? i.value.trim() : (r[d[0]] || ''); });
        if (data.nome.length < 3) { err.textContent = 'O nome precisa ter pelo menos 3 letras.'; f.elements.nome.focus(); return; }
        ok.disabled = true; ok.textContent = 'Salvando...';
        update(r.id, data).then(function (row) { if (row) all = all.map(function (y) { return y.id === r.id ? row : y; }); draw(); status.textContent = 'Alterações salvas.'; })
          .catch(function (e2) { ok.disabled = false; ok.textContent = 'Salvar'; err.textContent = e2.message || 'Não foi possível salvar agora.'; });
      });
    }
    s.addEventListener('input', draw);
    status.textContent = 'Carregando...';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    s.focus();
    list(modulo).then(function (r) { all = r; draw(); }).catch(function (e) { status.textContent = e.message || 'Não foi possível carregar agora.'; });
    return dlg;
  }
  var API = { attach: attach, openManager: openManager, search: search, list: list, update: update, remove: remove, invalidate: invalidate, composePlaca: composePlaca, details: details };
  root.KacSavedVisitors = API;
  function bindOpeners() { if (!doc) return; var b = doc.getElementById('btnSavedVisitors'); if (b && !b.__sv) { b.__sv = true; b.addEventListener('click', function () { openManager(b.getAttribute('data-sv-module') || 'empresarial', b); }); } }
  if (doc) { if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', bindOpeners); else bindOpeners(); }
  if (root.eventBus && root.SystemEvents) { try { root.eventBus.on(root.SystemEvents.DB_SAVE_SUCCESS, invalidate); } catch (_) {} }
  if (typeof module !== 'undefined') module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);

;
/* src/ui/VisitInvites.js */
/* Convites de visita (Onda 1, item 2): o anfitrião cria um convite (link + código curto) e compartilha pelo próprio celular
   (Copiar / Compartilhar — o sistema não envia nada). A portaria busca pelo código e marca a chegada. Revogar a qualquer momento.
   Dados só de /api/convites-visita (org resolvida no servidor). <dialog> acessível; DOM só via textContent. */
(function (root) {
  'use strict';
  var doc = root.document;
  function api() { return root.apiService; }
  function remote() { try { return !!(root.authService && root.authService.isRemoteMode && root.authService.isRemoteMode()); } catch (_) { return false; } }
  function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
  function btn(cls, text, label) { var b = el('button', cls, text); b.type = 'button'; if (label) b.setAttribute('aria-label', label); return b; }
  function field(id, label, type, extra) {
    var w = el('div', 'inv-field'); var l = el('label', 'sv-label', label); l.htmlFor = id;
    var i = el(type === 'select' ? 'select' : 'input', 'form-control'); i.id = id; i.name = id; if (type !== 'select') i.type = type;
    Object.keys(extra || {}).forEach(function (k) { if (k === 'options') extra.options.forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; i.appendChild(op); }); else i.setAttribute(k, extra[k]); });
    w.append(l, i); return { wrap: w, input: i };
  }
  function today() { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()); } catch (_) { return new Date().toISOString().slice(0, 10); } }
  function plusDays(iso, n) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function br(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] : iso; }
  var STATE = { active: 'Ativo', revoked: 'Revogado', expired: 'Expirado', used_up: 'Usado' };
  var VISIT = { 0: 'Agendado', 1: 'Na portaria', 2: 'Saiu' };
  function linkFor(token) { return root.location.origin + '/convite.html#t=' + token; }
  function copy(text) {
    if (root.navigator.clipboard && root.navigator.clipboard.writeText) return root.navigator.clipboard.writeText(text);
    return new Promise(function (ok, no) { var t = el('textarea'); t.value = text; t.setAttribute('readonly', ''); t.className = 'sv-sr'; doc.body.appendChild(t); t.select(); try { doc.execCommand('copy') ? ok() : no(); } catch (e) { no(e); } t.remove(); });
  }
  function reloadAgenda(modulo) { try { var t = doc.querySelector('.tab.active'); if (root.renderController && t) root.renderController.reloadDailyData(t.getAttribute('data-dia'), modulo); } catch (_) {} }

  function open(modulo, opener, opts) {
    opts = opts || {};
    if (!remote()) { root.alert('Convites ficam disponíveis com a conta online.'); return null; }
    var old = doc.getElementById('invManager'); if (old) old.remove();
    var dlg = el('dialog', 'sv-dialog inv-dialog'); dlg.id = 'invManager'; dlg.setAttribute('aria-labelledby', 'invMgrTitle');
    var head = el('div', 'sv-head'); var h = el('h2', 'sv-title', 'Convites de visita'); h.id = 'invMgrTitle';
    var x = btn('btn-icon sv-close', '×', 'Fechar'); head.append(h, x);
    var body = el('div', 'sv-body');
    var status = el('p', 'sv-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');

    // 1) Portaria: buscar por código
    var look = el('form', 'inv-look'); look.noValidate = true; look.setAttribute('role', 'search'); look.setAttribute('aria-label', 'Buscar convite pelo código');
    var lf = field('invCode', 'Código do convite (portaria)', 'text', { maxlength: '9', autocomplete: 'off', autocapitalize: 'characters', placeholder: 'ABCD-2345', inputmode: 'text', spellcheck: 'false' });
    var lb = el('button', 'btn-outline sv-btn', 'Buscar'); lb.type = 'submit';
    var lrow = el('div', 'inv-row'); lrow.append(lf.wrap, lb); look.appendChild(lrow);
    var lres = el('div', 'inv-lookres'); lres.setAttribute('aria-live', 'polite');

    // 2) Novo convite
    var nb = btn('btn-gold sv-btn inv-new', 'Novo convite'); nb.setAttribute('aria-expanded', 'false'); nb.setAttribute('aria-controls', 'invForm');
    var form = el('form', 'sv-form inv-form-host'); form.id = 'invForm'; form.noValidate = true; form.hidden = true; form.setAttribute('aria-label', 'Novo convite');
    var t0 = today();
    var fNome = field('invNomeH', 'Nome do visitante (opcional)', 'text', { maxlength: '120', autocomplete: 'off' });
    var fHost = field('invHost', modulo === 'residencial' ? 'Quem recebe (opcional)' : 'Quem recebe (opcional)', 'text', { maxlength: '120', autocomplete: 'off' });
    var fUni = field('invUni', modulo === 'residencial' ? 'Unidade (ex.: Apto 101)' : 'Destino (opcional)', 'text', { maxlength: '120', autocomplete: 'off' });
    var fData = field('invData', 'Data da visita', 'date', { min: t0, max: plusDays(t0, 60), required: '' }); fData.input.value = t0;
    var fIni = field('invIni', 'Das', 'time', { required: '' }); fIni.input.value = '09:00';
    var fFim = field('invFim', 'Até', 'time', { required: '' }); fFim.input.value = '18:00';
    var times = el('div', 'inv-row inv-times'); times.append(fIni.wrap, fFim.wrap);
    var fAvisar = field('invAvisar', 'Avisar quem quando chegar', 'select', { options: [['', 'Eu (quem cria o convite)']] });
    api().get('/avisos/membros').then(function (ms) { (ms || []).forEach(function (m) { if (m.eu) return; var o = el('option', null, m.label); o.value = m.id; fAvisar.input.appendChild(o); }); }).catch(function () {});
    var fUsos = field('invUsos', 'Quantas pessoas podem usar', 'select', { options: [['1', '1 pessoa (uso único)'], ['2', '2 pessoas'], ['3', '3 pessoas'], ['5', '5 pessoas'], ['10', '10 pessoas'], ['20', '20 pessoas']] });
    var fVal = field('invVal', 'Link válido até (opcional)', 'datetime-local', { 'aria-describedby': 'invValHint' });
    var vh = el('p', 'sv-hint', 'Sem preencher, o link vale até o fim do horário da visita.'); vh.id = 'invValHint';
    var ferr = el('p', 'sv-err'); ferr.setAttribute('role', 'alert');
    var fbar = el('div', 'sv-actions'); var fcan = btn('btn-cancel sv-btn', 'Cancelar'); var fok = el('button', 'btn-gold sv-btn', 'Criar convite'); fok.type = 'submit'; fbar.append(fcan, fok);
    form.append(fNome.wrap, fHost.wrap, fUni.wrap, fData.wrap, times, fUsos.wrap, fAvisar.wrap, fVal.wrap, vh, ferr, fbar);
    var share = el('div', 'inv-share'); share.hidden = true; share.setAttribute('tabindex', '-1');

    // 3) Lista
    var lh = el('h3', 'inv-sub', 'Convites recentes');
    var ul = el('ul', 'sv-rows'); ul.setAttribute('aria-label', 'Convites recentes');
    body.append(look, lres, el('hr', 'inv-hr'), nb, form, share, status, lh, ul);
    dlg.append(head, body); doc.body.appendChild(dlg);

    function done() { dlg.close(); }
    x.addEventListener('click', done);
    dlg.addEventListener('close', function () { dlg.remove(); var back = opener && opener.offsetParent !== null ? opener : doc.querySelector('.bn-more summary'); if (back && back.focus) back.focus(); });
    nb.addEventListener('click', function () { var on = form.hidden; form.hidden = !on; nb.setAttribute('aria-expanded', on ? 'true' : 'false'); share.hidden = true; if (on) fNome.input.focus(); });
    fcan.addEventListener('click', function () { form.hidden = true; nb.setAttribute('aria-expanded', 'false'); nb.focus(); });

    function regLine(r) {
      var li = el('li', 'inv-reg'); var t = el('span', 'inv-reg-name', r.nome + (r.placa ? ' · ' + r.placa : ''));
      var s = el('span', 'inv-badge', VISIT[r.visitStatus] || 'Visita removida'); li.append(t, s);
      if (r.visitStatus === 0) {
        var c = btn('btn-gold sv-btn', 'Marcar chegada', 'Marcar chegada de ' + r.nome);
        c.addEventListener('click', function () {
          c.disabled = true; c.setAttribute('aria-busy', 'true');
          api().put('/visitantes/' + encodeURIComponent(r.visit_id) + '/status', { status: 1, from: 0 }).then(function () { r.visitStatus = 1; s.textContent = VISIT[1]; c.remove(); status.textContent = r.nome + ': chegada registrada.'; reloadAgenda(modulo); })
            .catch(function (e) { c.disabled = false; c.removeAttribute('aria-busy'); status.textContent = e.status === 409 ? 'Status já alterado em outro aparelho.' : (e.message || 'Não foi possível marcar a chegada agora.'); });
        });
        li.appendChild(c);
      }
      return li;
    }
    function card(i, withRegs) {
      var li = el('li', 'sv-row inv-card'); var info = el('div', 'sv-info');
      info.appendChild(el('span', 'auto-name', i.visitor_name || 'Convite sem nome'));
      var meta = br(i.visit_date) + ' · ' + i.hora_inicio + '–' + i.hora_fim + ' · ' + i.uses + '/' + i.max_uses + (i.max_uses === 1 ? ' uso' : ' usos') + (i.unidade ? ' · ' + i.unidade : '');
      info.appendChild(el('span', 'auto-doc', meta));
      var b = el('span', 'inv-badge inv-' + i.estado, STATE[i.estado] || i.estado); info.appendChild(b);
      li.appendChild(info);
      if ((withRegs || i.cadastros.length) && i.cadastros.length) { var rl = el('ul', 'inv-regs'); rl.setAttribute('aria-label', 'Quem confirmou'); i.cadastros.forEach(function (r) { rl.appendChild(regLine(r)); }); info.appendChild(rl); }
      else if (withRegs) info.appendChild(el('span', 'auto-doc', 'Ninguém confirmou por este convite ainda.'));
      if (i.estado === 'active') {
        var act = el('div', 'sv-actions'); var rv = btn('btn-cancel sv-btn', 'Revogar', 'Revogar convite ' + (i.visitor_name || 'sem nome') + ' de ' + br(i.visit_date));
        rv.addEventListener('click', function () {
          if (!root.confirm('Revogar este convite? O link e o código param de funcionar. Visitas já confirmadas continuam na agenda.')) return;
          rv.disabled = true; api().post('/convites-visita/' + encodeURIComponent(i.id) + '/revogar', {}).then(function () { status.textContent = 'Convite revogado.'; load(); lres.replaceChildren(); })
            .catch(function (e) { rv.disabled = false; status.textContent = e.message || 'Não foi possível revogar agora.'; });
        });
        act.appendChild(rv); li.appendChild(act);
      }
      return li;
    }
    function load() {
      return api().get('/convites-visita?modulo=' + encodeURIComponent(modulo)).then(function (rows) {
        ul.replaceChildren(); rows = Array.isArray(rows) ? rows : [];
        if (!rows.length) ul.appendChild(el('li', 'sv-hint', 'Nenhum convite criado ainda.'));
        rows.forEach(function (i) { ul.appendChild(card(i, false)); });
      }).catch(function (e) { status.textContent = e.message || 'Não foi possível carregar os convites agora.'; });
    }
    lf.input.addEventListener('input', function () { var v = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); this.value = v.length > 4 ? v.slice(0, 4) + '-' + v.slice(4) : v; });
    look.addEventListener('submit', function (e) {
      e.preventDefault(); var code = lf.input.value.replace(/[^A-Z0-9]/gi, '');
      lres.replaceChildren(); if (code.length !== 8) { lres.appendChild(el('p', 'sv-err', 'O código tem 8 letras e números, como ABCD-2345.')); lf.input.focus(); return; }
      lb.disabled = true; lres.appendChild(el('p', 'sv-hint', 'Buscando...'));
      api().get('/convites-visita/codigo/' + encodeURIComponent(code)).then(function (i) { lres.replaceChildren(); var u = el('ul', 'sv-rows'); u.setAttribute('aria-label', 'Convite encontrado'); u.appendChild(card(i, true)); lres.appendChild(u); })
        .catch(function (er) { lres.replaceChildren(); lres.appendChild(el('p', 'sv-err', er.message || 'Nenhum convite com este código.')); })
        .then(function () { lb.disabled = false; });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); ferr.textContent = '';
      var data = { modulo: modulo, nome: fNome.input.value.trim(), anfitriao: fHost.input.value.trim(), unidade: fUni.input.value.trim(), data: fData.input.value, inicio: fIni.input.value, fim: fFim.input.value, usos: Number(fUsos.input.value), validoAte: fVal.input.value || '', avisar: fAvisar.input.value || '' };
      if (!data.data || !data.inicio || !data.fim) { ferr.textContent = 'Informe a data e o horário da visita.'; return; }
      if (data.fim <= data.inicio) { ferr.textContent = 'O horário final precisa ser depois do inicial.'; fFim.input.focus(); return; }
      if (data.nome && data.nome.length < 3) { ferr.textContent = 'O nome precisa ter pelo menos 3 letras (ou deixe em branco).'; fNome.input.focus(); return; }
      fok.disabled = true; fok.textContent = 'Criando...';
      api().post('/convites-visita', data).then(function (inv) { form.reset(); fData.input.value = t0; fIni.input.value = '09:00'; fFim.input.value = '18:00'; form.hidden = true; nb.setAttribute('aria-expanded', 'false'); showShare(inv); load(); })
        .catch(function (e2) { ferr.textContent = e2.message || 'Não foi possível criar o convite agora.'; })
        .then(function () { fok.disabled = false; fok.textContent = 'Criar convite'; });
    });
    function showShare(inv) {
      var link = linkFor(inv.token); share.replaceChildren();
      share.appendChild(el('h3', 'inv-sub', 'Convite criado'));
      share.appendChild(el('p', 'sv-hint', 'Envie o link ao visitante pelo seu celular (WhatsApp, e-mail...). O link e o código aparecem só agora: copie ou compartilhe antes de fechar.'));
      var ll = el('label', 'sv-label', 'Link do convite'); ll.htmlFor = 'invLink'; var li = el('input', 'form-control inv-link'); li.id = 'invLink'; li.readOnly = true; li.value = link;
      var cl = el('p', 'inv-codeline'); cl.append(el('span', 'sv-label', 'Código para a portaria: '), el('strong', 'inv-code', inv.codigo));
      var bar = el('div', 'sv-actions inv-share-actions');
      var bl = btn('btn-outline sv-btn', 'Copiar link'), bc = btn('btn-outline sv-btn', 'Copiar código');
      bl.addEventListener('click', function () { copy(link).then(function () { status.textContent = 'Link copiado.'; }, function () { li.select(); status.textContent = 'Selecione e copie o link.'; }); });
      bc.addEventListener('click', function () { copy(inv.codigo).then(function () { status.textContent = 'Código copiado.'; }, function () { status.textContent = 'Anote o código: ' + inv.codigo; }); });
      bar.append(bl, bc);
      if (root.navigator.share) {
        var bs = btn('btn-gold sv-btn', 'Compartilhar');
        bs.addEventListener('click', function () { root.navigator.share({ title: 'Convite de visita', text: 'Seu convite de visita para ' + br(inv.visit_date) + ', das ' + inv.hora_inicio + ' às ' + inv.hora_fim + '. Código: ' + inv.codigo, url: link }).catch(function () {}); });
        bar.appendChild(bs);
      }
      share.append(ll, li, cl, bar); share.hidden = false; share.focus();
      status.textContent = 'Convite criado. Código ' + inv.codigo + '.';
    }
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    if (opts.focus === 'code') lf.input.focus(); else nb.focus();
    status.textContent = 'Carregando...'; load().then(function () { if (status.textContent === 'Carregando...') status.textContent = ''; });
    return dlg;
  }
  root.KacVisitInvites = { open: open };
  function bind() { if (!doc) return; var b = doc.getElementById('btnInvites'); if (b && !b.__inv) { b.__inv = true; b.addEventListener('click', function () { open(b.getAttribute('data-inv-module') || 'empresarial', b); }); } }
  if (doc) { if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', bind); else bind(); }
})(typeof window !== 'undefined' ? window : globalThis);

;
/* src/ui/ArrivalAlerts.js */
/* Avisos de chegada (Onda 1, item 3): o usuário liga/desliga o aviso no celular (Web Push) e por e-mail, e envia um teste.
   Funciona no Chrome do Android e no iPhone/iPad com o app instalado na Tela de Início (iOS 16.4+). Opt-in: nada é ligado sozinho.
   Dados só de /api/avisos (sempre do próprio usuário). <dialog> acessível; DOM só via textContent. */
(function (root) {
  'use strict';
  var doc = root.document, nav = root.navigator;
  function api() { return root.apiService; }
  function remote() { try { return !!(root.authService && root.authService.isRemoteMode && root.authService.isRemoteMode()); } catch (_) { return false; } }
  function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
  function btn(cls, text) { var b = el('button', cls, text); b.type = 'button'; return b; }
  function isIOS() { return /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1); }
  function standalone() { try { return root.matchMedia('(display-mode: standalone)').matches || nav.standalone === true; } catch (_) { return false; } }
  function pushSupported() { return 'serviceWorker' in nav && 'PushManager' in root && 'Notification' in root; }
  function deviceLabel() { var ua = nav.userAgent; var os = /Android/.test(ua) ? 'Android' : isIOS() ? 'iPhone/iPad' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Aparelho';
    var br = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navegador'; return os + ' (' + br + ')'; }
  function keyBytes(b64) { var s = String(b64).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var bin = root.atob(s); var a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function reg() { return nav.serviceWorker.getRegistration('/').then(function (r) { return r || nav.serviceWorker.register('/sw.js', { scope: '/' }); }).then(function () { return nav.serviceWorker.ready; }); }
  function currentSub() { if (!pushSupported()) return Promise.resolve(null); return reg().then(function (r) { return r.pushManager.getSubscription(); }).catch(function () { return null; }); }
  function sendSub(sub) { var j = sub.toJSON(); return api().post('/avisos/aparelhos', { endpoint: j.endpoint, keys: j.keys, label: deviceLabel() }); }
  function enablePush(vapid) {
    if (!pushSupported()) return Promise.reject(new Error(isIOS() && !standalone() ? 'No iPhone, primeiro adicione o app à Tela de Início (Compartilhar > Adicionar à Tela de Início) e abra pelo ícone.' : 'Este navegador não aceita avisos. Use o Chrome no Android ou o app instalado no iPhone.'));
    if (!vapid) return Promise.reject(new Error('Os avisos no celular ainda não estão disponíveis neste sistema.'));
    return root.Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') throw new Error(perm === 'denied' ? 'As notificações estão bloqueadas para este site. Libere nas configurações do navegador (Notificações) e tente de novo.' : 'Você não permitiu as notificações. Toque de novo e escolha Permitir.');
      return reg();
    }).then(function (r) {
      return r.pushManager.getSubscription().then(function (s) { return s || r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapid) }); });
    }).then(sendSub);
  }
  function disablePush() { return currentSub().then(function (s) { var ep = s && s.endpoint; return (s ? s.unsubscribe().catch(function () {}) : Promise.resolve()).then(function () { return ep ? api().post('/avisos/aparelhos/remover', { endpoint: ep }).catch(function () {}) : null; }); }).then(function () { return api().put('/avisos', { push: false }); }); }

  function open(opener) {
    if (!remote()) { root.alert('Avisos de chegada ficam disponíveis com a conta online.'); return null; }
    var old = doc.getElementById('alertsDialog'); if (old) old.remove();
    var dlg = el('dialog', 'sv-dialog inv-dialog al-dialog'); dlg.id = 'alertsDialog'; dlg.setAttribute('aria-labelledby', 'alTitle');
    var head = el('div', 'sv-head'); var h = el('h2', 'sv-title', 'Avisos de chegada'); h.id = 'alTitle'; var x = btn('btn-icon sv-close', '×'); x.setAttribute('aria-label', 'Fechar'); head.append(h, x);
    var body = el('div', 'sv-body');
    var intro = el('p', 'sv-hint', 'Quando a portaria marcar a chegada de um visitante seu, você recebe um aviso. O aviso não mostra o nome do visitante, só o horário agendado.');
    var status = el('p', 'sv-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    function sw(id, label, hint) {
      var w = el('div', 'al-row'); var l = el('label', 'al-switch'); l.htmlFor = id; var i = el('input'); i.type = 'checkbox'; i.id = id; i.setAttribute('role', 'switch');
      var t = el('span', 'al-label'); t.append(el('strong', null, label), el('span', 'auto-doc', hint)); l.append(i, t); w.appendChild(l); return { wrap: w, input: i, hint: t.lastChild };
    }
    var sp = sw('alPush', 'Aviso neste celular', 'Notificação na tela, mesmo com o app fechado.');
    var se = sw('alEmail', 'Aviso por e-mail', 'Se o celular não receber, mandamos um e-mail curto.');
    var ios = el('p', 'al-note'); ios.hidden = true;
    var devH = el('h3', 'inv-sub', 'Aparelhos com aviso ligado'); var devs = el('ul', 'sv-rows'); devs.setAttribute('aria-label', 'Aparelhos com aviso ligado');
    var tb = btn('btn-gold sv-btn al-test', 'Enviar aviso de teste');
    body.append(intro, sp.wrap, ios, se.wrap, tb, status, devH, devs);
    dlg.append(head, body); doc.body.appendChild(dlg);
    var state = null;
    x.addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('close', function () { dlg.remove(); var back = opener && opener.offsetParent !== null ? opener : doc.querySelector('.bn-more summary'); if (back && back.focus) back.focus(); });
    function drawDevices() {
      devs.replaceChildren(); var list = (state && state.aparelhos) || [];
      if (!list.length) devs.appendChild(el('li', 'sv-hint', 'Nenhum aparelho ainda.'));
      list.forEach(function (d) {
        var li = el('li', 'sv-row'); var info = el('div', 'sv-info'); info.append(el('span', 'auto-name', d.label), el('span', 'auto-doc', d.ultimoOk ? 'Último aviso recebido: ' + new Date(d.ultimoOk).toLocaleString('pt-BR') : 'Ligado em ' + new Date(d.desde).toLocaleDateString('pt-BR')));
        var rm = btn('btn-cancel sv-btn', 'Remover'); rm.setAttribute('aria-label', 'Remover ' + d.label);
        rm.addEventListener('click', function () { rm.disabled = true; api().post('/avisos/aparelhos/remover', { id: d.id }).then(load).then(function () { status.textContent = 'Aparelho removido.'; }).catch(function (e) { rm.disabled = false; status.textContent = e.message; }); });
        var act = el('div', 'sv-actions'); act.appendChild(rm); li.append(info, act); devs.appendChild(li);
      });
    }
    function load() {
      return Promise.all([api().get('/avisos'), currentSub()]).then(function (r) {
        state = r[0] || {}; var here = r[1];
        sp.input.checked = !!(state.push && here); se.input.checked = !!state.email;
        se.input.disabled = !state.emailDisponivel; if (!state.emailDisponivel) se.hint.textContent = 'Ainda não disponível neste sistema.'; else if (state.emailConta) se.hint.textContent = 'Se o celular não receber, mandamos um e-mail curto para ' + state.emailConta + '.';
        if (isIOS() && !standalone()) { ios.hidden = false; ios.textContent = 'No iPhone/iPad: toque em Compartilhar e em "Adicionar à Tela de Início". Depois abra o Guardião Komodo pelo ícone e ligue o aviso aqui.'; }
        else if (!pushSupported()) { ios.hidden = false; ios.textContent = 'Este navegador não aceita avisos. Use o Chrome no Android ou o app instalado no iPhone.'; }
        else if (root.Notification.permission === 'denied') { ios.hidden = false; ios.textContent = 'As notificações estão bloqueadas para este site. Libere em Configurações do navegador > Notificações.'; }
        drawDevices();
      }).catch(function (e) { status.textContent = e.message || 'Não foi possível carregar agora.'; });
    }
    sp.input.addEventListener('change', function () {
      var on = sp.input.checked; sp.input.disabled = true; status.textContent = on ? 'Ligando...' : 'Desligando...';
      (on ? enablePush(state && state.vapidPublicKey) : disablePush()).then(function () { status.textContent = on ? 'Aviso ligado neste celular.' : 'Aviso desligado neste celular.'; return load(); })
        .catch(function (e) { sp.input.checked = !on; status.textContent = e.message || 'Não foi possível agora.'; }).then(function () { sp.input.disabled = false; });
    });
    se.input.addEventListener('change', function () {
      var on = se.input.checked; se.input.disabled = true;
      api().put('/avisos', { email: on }).then(function () { status.textContent = on ? 'Aviso por e-mail ligado.' : 'Aviso por e-mail desligado.'; return load(); })
        .catch(function (e) { se.input.checked = !on; status.textContent = e.message; }).then(function () { se.input.disabled = !(state && state.emailDisponivel); });
    });
    tb.addEventListener('click', function () {
      tb.disabled = true; status.textContent = 'Enviando teste...';
      api().post('/avisos/teste', { email: se.input.checked && !sp.input.checked }).then(function (r) {
        var p = r && r.push || {}; var parts = [];
        if (p.sent) parts.push(p.sent === 1 ? 'Aviso enviado para 1 aparelho.' : 'Aviso enviado para ' + p.sent + ' aparelhos.');
        if (p.failed) parts.push(p.failed + ' aparelho(s) não recebeu(ram).');
        if (r && r.email === 'sent') parts.push('E-mail de teste enviado.'); else if (r && r.email && r.email !== 'off') parts.push('E-mail não enviado agora.');
        status.textContent = parts.join(' ') || 'Nenhum aviso ligado. Ligue o aviso no celular ou por e-mail.'; return load();
      }).catch(function (e) { status.textContent = e.message || 'Não foi possível enviar o teste.'; }).then(function () { tb.disabled = false; });
    });
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    sp.input.focus(); status.textContent = 'Carregando...'; load().then(function () { if (status.textContent === 'Carregando...') status.textContent = ''; });
    return dlg;
  }
  // Inscrição renovada pelo navegador: reenvia ao servidor (sem pedir nada ao usuário).
  if (nav && nav.serviceWorker && nav.serviceWorker.addEventListener) nav.serviceWorker.addEventListener('message', function (e) { if (e.data && e.data.type === 'KAC_PUSH_RESUBSCRIBE' && remote()) currentSub().then(function (s) { if (s) sendSub(s).catch(function () {}); }); });
  root.KacArrivalAlerts = { open: open };
  function bind() { if (!doc) return; var b = doc.getElementById('btnAlerts'); if (b && !b.__al) { b.__al = true; b.addEventListener('click', function () { open(b); }); } }
  if (doc) { if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', bind); else bind(); }
})(typeof window !== 'undefined' ? window : globalThis);

;
/* src/ui/FormManager.js */
/**
 * FormManager.js
 * 
 * Camada responsável por abstrair manipulação de formulários da interface HTML.
 * O FormManager usa atributos "data-field" para serializar e preencher formulários.
 * Assina e despacha eventos no EventBus, desacoplando completamente da I.A e Regras de Negócio.
 */

class FormManager {
    constructor() {
        this._bindEvents();
    }

    /**
     * Assina os eventos globais
     */
    _bindEvents() {
        if (window.eventBus && window.SystemEvents) {
            window.eventBus.on(window.SystemEvents.AI_FILL_FORM, (data) => {
                // Preenchemos o formulário genérico de visitante
                // Futuramente pode haver um payload.formId, por hora fixamos 'form-visitante'
                this.fill('form-visitante', data);
            });
        }
    }

    /**
     * Serializa um form html para um DTO baseado nos atributos data-field
     * @param {string} formId 
     * @returns {Object} DTO com chave=valor
     */
    serialize(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};

        const fields = form.querySelectorAll('[data-field]');
        const dto = {};

        fields.forEach(field => {
            const fieldName = field.getAttribute('data-field');
            dto[fieldName] = field.value ? field.value.trim() : '';
        });

        return dto;
    }

    /**
     * Preenche um formulário html a partir de um DTO
     * @param {string} formId 
     * @param {Object} dto Chave=valor
     */
    fill(formId, dto) {
        const form = document.getElementById(formId);
        if (!form || !dto) return;

        const fields = form.querySelectorAll('[data-field]');
        fields.forEach(field => {
            const fieldName = field.getAttribute('data-field');
            if (dto[fieldName] !== undefined && dto[fieldName] !== null) {
                field.value = dto[fieldName];
                
                // Dispara o evento de input para triggers visuais (Mascara, Validação em Tempo Real)
                field.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    }

    /**
     * Limpa os campos de um formulário
     * @param {string} formId 
     */
    clear(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        const fields = form.querySelectorAll('[data-field]');
        fields.forEach(field => {
            field.value = '';
        });
    }
}

// Inicializa a instância Global do FormManager
window.formManager = new FormManager();

;
/* src/ui/RenderController.js */
/**
 * RenderController.js
 * 
 * Camada de visualização reativa (Fase 4).
 * Escuta os eventos do AppStore e desenha a UI automaticamente,
 * eliminando a necessidade de chamadas diretas como renderDaily().
 */

class RenderController {
    constructor() {
        this._bindEvents();
        this.updateCalendarUI();
    }

    updateCalendarUI() {
        const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
        const KD = window.KomodoDate;
        if (!KD) return;
        const today = KD.todayParts();
        const week = KD.weekDates();
        const monthEl = document.querySelector('.month-title');
        const refMonth = KD.getReference() ? Number(KD.getReference().slice(5, 7)) : today.month;
        if (monthEl) monthEl.textContent = monthNames[refMonth - 1];

        document.querySelectorAll('.tab').forEach(tab => {
            const diaStr = tab.getAttribute('data-dia');
            const info = week[diaStr];
            if (!info) return;
            // textContent (e não innerText) evita forçar layout da página inteira a cada aba (achado 8, TBT).
            const originalText = tab.textContent.trim().split(/\s+/)[0];
            tab.textContent = `${originalText} ${String(info.day).padStart(2, '0')}`;
            const isToday = KD.toISO(info) === KD.todayISO();
            if (!KD.getReference()) tab.classList.toggle('active', isToday);
            tab.classList.toggle('today', isToday);
        });
    }

    static currentModule() {
        return window.location.pathname.includes('residencial') ? 'residencial' : 'empresarial';
    }

    _bindEvents() {
        if (!window.eventBus || !window.SystemEvents) return;

        // Quando o repositório salva com sucesso, mandamos a Store recarregar
        window.eventBus.on(window.SystemEvents.DB_SAVE_SUCCESS, async () => {
            await this.reloadDailyData();
        });

        // Quando a Store notifica mudança de visitantes, renderizamos a tela
        window.eventBus.on('STORE_VISITORS_UPDATED', (state) => {
            if (typeof window.renderDaily === 'function') {
                // A função legado renderDaily será chamada passando os dados do Store
                window.renderDaily(state.dailyData);
            }
        });
    }

    /**
     * Recarrega os dados do dia ativo e atualiza a Store.
     * Pode ser chamado ao inicializar a página ou ao trocar a aba do dia.
     */
    async reloadDailyData(diaStr = null, modulo = null) {
        if (!window.appStore || !window.VisitorRepository) return;
        
        let visitorsState = window.appStore.getState('visitors');
        
        if (diaStr) {
            visitorsState.diaAtivo = diaStr;
        }

        // Tenta inferir o módulo caso não passado (fallback para a fase 5)
        if (!modulo) {
            modulo = RenderController.currentModule();
        }

        try {
            // Em vez de banco direto, usa o Repositorio criado na Fase 2
            const rows = await window.VisitorRepository.getAllDaily(visitorsState.diaAtivo, modulo);
            
            // Atualiza a store, que por sua vez disparará o evento de renderização
            window.appStore.setVisitorsState({
                diaAtivo: visitorsState.diaAtivo,
                dailyData: rows
            });
        } catch(e) {
            console.error("Falha ao recarregar dados diários: ", e);
        }
    }
}

// Inicializa o Controller global
window.renderController = new RenderController();

;
/* src/ui/AgendaNav.js */
/**
 * AgendaNav — navegação da agenda (semana anterior/próxima, seletor de data, "Hoje")
 * e visões Hoje / Próximos / Histórico, sem exigir mudança de esquema.
 * Datas sempre no fuso America/Sao_Paulo (KomodoDate).
 */
(function () {
  function modulo() { return window.location.pathname.includes('residencial') ? 'residencial' : 'empresarial'; }
  function KD() { return window.KomodoDate; }
  function activeDay() { const t = document.querySelector('.tab.active'); return t ? t.getAttribute('data-dia') : KD().todayKey(); }
  function el(tag, attrs, text) { const e = document.createElement(tag); Object.assign(e, attrs || {}); if (text) e.textContent = text; return e; }

  function goToDate(iso) {
    const kd = KD(); if (!kd || !iso) return;
    const today = kd.todayISO();
    kd.setReference(iso === today ? null : iso);
    if (window.renderController) window.renderController.updateCalendarUI();
    const day = kd.weekdayKeyOfISO(iso);
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-dia') === day));
    const picker = document.getElementById('agendaDate'); if (picker) picker.value = iso;
    setViewLabel('');
    if (window.renderController) window.renderController.reloadDailyData(day, modulo());
  }

  function shiftWeek(n) {
    const kd = KD(); const ref = kd.getReference() || kd.todayISO();
    const base = kd.weekDates(new Date(ref + 'T15:00:00Z'))[activeDay()];
    const cur = base ? kd.toISO(base) : ref;
    goToDate(kd.addDaysISO(cur, 7 * n));
  }

  function setViewLabel(text) { const l = document.getElementById('agendaViewLabel'); if (l) l.textContent = text; }

  async function showView(kind) {
    const kd = KD(); const today = kd.todayISO();
    let de = null, ate = null, label = '';
    if (kind === 'hoje') return goToDate(today);
    if (kind === 'futuro') { de = kd.addDaysISO(today, 1); label = 'Próximos agendamentos (a partir de amanhã)'; }
    if (kind === 'historico') { ate = kd.addDaysISO(today, -1); label = 'Histórico (até ontem)'; }
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    setViewLabel(label + '…');
    try {
      let rows = await window.VisitorRepository.getRange(modulo(), de, ate);
      if (kind === 'historico') rows = rows.slice().reverse();
      setViewLabel(label + ' — ' + rows.length + ' registro(s)');
      if (typeof window.renderDaily === 'function') window.renderDaily(rows, '', true);
    } catch (e) { setViewLabel('Falha ao carregar: ' + e.message); }
  }

  function build() {
    const nav = document.querySelector('.calendar-nav'); const tabs = document.getElementById('tabs');
    if (!nav || !tabs || !KD() || document.getElementById('agendaNav')) return;
    const bar = el('div', { id: 'agendaNav', className: 'agenda-nav' });
    const mk = (id, text, title, fn) => { const b = el('button', { type: 'button', id, className: 'btn-outline agenda-btn', title }, text); b.addEventListener('click', fn); return b; };
    bar.append(
      mk('agendaPrevWeek', '◀ Semana', 'Semana anterior', () => shiftWeek(-1)),
      mk('agendaToday', 'Hoje', 'Voltar para hoje', () => showView('hoje')),
      mk('agendaNextWeek', 'Semana ▶', 'Próxima semana', () => shiftWeek(1))
    );
    const picker = el('input', { type: 'date', id: 'agendaDate', className: 'agenda-date', title: 'Ir para a data' });
    picker.value = KD().todayISO();
    picker.addEventListener('change', () => goToDate(picker.value));
    bar.append(picker,
      mk('agendaViewFuture', 'Próximos', 'Agendamentos futuros', () => showView('futuro')),
      mk('agendaViewHistory', 'Histórico', 'Registros anteriores', () => showView('historico')));
    const label = el('div', { id: 'agendaViewLabel', className: 'agenda-view-label' });
    // Achado 8 (CLS): o espaço já vem reservado no HTML (#agendaNavSlot); sem ele, insere após as abas como antes.
    const slot = document.getElementById('agendaNavSlot');
    if (slot) slot.append(bar, label);
    else { tabs.insertAdjacentElement('afterend', bar); bar.insertAdjacentElement('afterend', label); }
    // Ao clicar numa aba, sincroniza o seletor de data com a semana em exibição.
    tabs.addEventListener('click', e => {
      const t = e.target.closest('.tab'); if (!t) return;
      const w = KD().weekDates()[t.getAttribute('data-dia')]; if (w) picker.value = KD().toISO(w);
      setViewLabel('');
    });
  }

  window.AgendaNav = { goToDate, shiftWeek, showView, build };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();

;
/* src/ui/VisitActions.js */
/* Reagendar + Histórico da visita (rotas /reagendar e /historico). Datas em America/Sao_Paulo. Sem innerHTML com dados. */
(function () {
  'use strict';
  var TZ = 'America/Sao_Paulo';
  var ACTIONS = { created: 'Criado', rescheduled: 'Reagendado', status_changed: 'Status alterado', deleted: 'Excluído' };
  var STATUS = ['Aguardando', 'Entrada', 'Saída'];
  function modulo() { return /residencial/.test(location.pathname) ? 'residencial' : 'empresarial'; }
  function el(tag, props, text) { var e = document.createElement(tag); Object.keys(props || {}).forEach(function (k) { if (k === 'attrs') Object.keys(props.attrs).forEach(function (a) { e.setAttribute(a, props.attrs[a]); }); else e[k] = props[k]; }); if (text != null) e.textContent = text; return e; }
  function br(iso) { return iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—'; }
  function stamp(ts) { try { return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }).format(new Date(ts)); } catch (_) { return String(ts || ''); } }
  function todayISO() { return window.KomodoDate && window.KomodoDate.todayISO ? window.KomodoDate.todayISO() : new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); }
  function findVisit(id) { var st = window.appStore && window.appStore.getState('visitors'); return st && (st.dailyData || []).find(function (r) { return String(r.id) === String(id); }); }
  function reload() { var st = window.appStore && window.appStore.getState('visitors'); if (window.renderController) window.renderController.reloadDailyData(st && st.diaAtivo, modulo()); }

  var dlg, lastFocus;
  function dialog() {
    if (dlg) return dlg;
    dlg = el('dialog', { id: 'visitDialog', className: 'visit-dialog', attrs: { 'aria-labelledby': 'visitDialogTitle' } });
    dlg.addEventListener('close', function () { if (lastFocus && lastFocus.focus) lastFocus.focus(); });
    document.body.appendChild(dlg);
    return dlg;
  }
  function open(title, body, trigger) {
    var d = dialog(); d.textContent = '';
    var head = el('div', { className: 'visit-dialog-head' });
    head.append(el('h2', { id: 'visitDialogTitle' }, title), el('button', { type: 'button', className: 'visit-dialog-close', attrs: { 'aria-label': 'Fechar' } }, '✕'));
    head.lastChild.addEventListener('click', function () { d.close(); });
    d.append(head, body);
    lastFocus = trigger || document.activeElement;
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    var first = d.querySelector('input,button:not(.visit-dialog-close)'); if (first) first.focus();
  }

  function openReschedule(id, trigger) {
    var v = findVisit(id); if (!v) return;
    var form = el('form', { className: 'visit-form', noValidate: true });
    var info = el('p', { className: 'visit-dialog-info' }, v.nome + ' — atual: ' + br(v.data) + ' às ' + (v.hora || '—'));
    var lData = el('label', { htmlFor: 'reschedData' }, 'Nova data');
    var iData = el('input', { type: 'date', id: 'reschedData', required: true, value: v.data || todayISO() });
    var lHora = el('label', { htmlFor: 'reschedHora' }, 'Novo horário');
    var iHora = el('input', { type: 'time', id: 'reschedHora', required: true, value: v.hora || '' });
    var msg = el('p', { className: 'visit-form-msg', attrs: { role: 'status', 'aria-live': 'polite' } });
    var actions = el('div', { className: 'visit-form-actions' });
    var cancel = el('button', { type: 'button', className: 'btn-outline' }, 'Cancelar');
    var save = el('button', { type: 'submit', className: 'btn-primary', id: 'reschedSave' }, 'Salvar reagendamento');
    cancel.addEventListener('click', function () { dlg.close(); });
    actions.append(cancel, save);
    form.append(info, lData, iData, lHora, iHora, msg, actions);
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iData.value) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(iHora.value)) { msg.textContent = 'Informe data e horário válidos.'; return; }
      if (iData.value === v.data && iHora.value === v.hora) { msg.textContent = 'Nada mudou.'; return; }
      save.disabled = true; msg.textContent = 'Salvando…';
      try {
        await window.VisitorRepository.reschedule(v.id, iData.value, iHora.value);
        msg.textContent = 'Reagendado para ' + br(iData.value) + ' às ' + iHora.value + '.';
        dlg.close(); lastFocus = null; reload();
      } catch (ex) { msg.textContent = 'Erro: ' + (ex && ex.message || 'falha ao reagendar'); save.disabled = false; }
    });
    open('Reagendar visita', form, trigger);
  }

  async function openHistory(id, trigger) {
    var v = findVisit(id);
    var box = el('div', { className: 'visit-history' });
    var status = el('p', { attrs: { role: 'status', 'aria-live': 'polite' } }, 'Carregando histórico…');
    box.append(status);
    open('Histórico — ' + (v ? v.nome : 'visita'), box, trigger);
    try {
      var r = await window.VisitorRepository.history(id);
      var rows = Array.isArray(r) ? r : ((r && r.data) || []); // ApiService devolve o array já desembrulhado
      status.textContent = rows.length ? rows.length + ' evento(s)' : 'Sem histórico registrado.';
      var ol = el('ol', { className: 'visit-history-list' });
      rows.forEach(function (h) {
        var li = el('li');
        li.append(el('strong', {}, ACTIONS[h.action] || h.action), el('time', { dateTime: h.created_at || '' }, ' · ' + stamp(h.created_at)));
        var d = '';
        if (h.action === 'rescheduled') d = br(h.old_data) + ' ' + (h.old_hora || '') + ' → ' + br(h.new_data) + ' ' + (h.new_hora || '');
        else if (h.action === 'created') d = 'Agendado para ' + br(h.new_data) + ' ' + (h.new_hora || '');
        else if (h.action === 'status_changed') d = (STATUS[h.old_status] || h.old_status) + ' → ' + (STATUS[h.new_status] || h.new_status);
        if (d) li.append(el('div', { className: 'visit-history-detail' }, d));
        ol.append(li);
      });
      box.append(ol);
    } catch (ex) { status.textContent = (ex && /404|não encontrado/i.test(ex.message)) ? 'Sem histórico registrado.' : 'Erro ao carregar histórico.'; }
  }

  function decorate(root) {
    (root || document).querySelectorAll('#cardsContainer .card[data-id]').forEach(function (card) {
      if (card.querySelector('.visit-actions')) return;
      var id = card.dataset.id; var v = findVisit(id); var nome = v ? v.nome : 'visita';
      var bar = el('div', { className: 'visit-actions' });
      bar.append(
        el('button', { type: 'button', className: 'btn-outline visit-btn', attrs: { 'data-visit-action': 'reschedule', 'data-id': id, 'aria-label': 'Reagendar ' + nome } }, '📅 Reagendar'),
        el('button', { type: 'button', className: 'btn-outline visit-btn', attrs: { 'data-visit-action': 'history', 'data-id': id, 'aria-label': 'Histórico de ' + nome } }, '🕘 Histórico'));
      card.appendChild(bar);
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-visit-action]'); if (!b) return;
    e.stopPropagation();
    if (b.dataset.visitAction === 'reschedule') openReschedule(b.dataset.id, b); else openHistory(b.dataset.id, b);
  }, true);
  function start() { var c = document.getElementById('cardsContainer'); if (!c) return; decorate(c); new MutationObserver(function () { decorate(c); }).observe(c, { childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.VisitActions = { decorate: decorate, openReschedule: openReschedule, openHistory: openHistory, _fmt: { br: br, stamp: stamp } };
})();

;
/* src/ui/A11yEnhancer.js */
/* Fase D (D4–D6): melhorias de acessibilidade por observação do DOM — não altera handlers, dados nem fluxo.
   D4 aria-pressed nos botões de alternância; aria-current nas abas de dia.
   D5 aria-invalid + dica ligada ao campo (nome ≥3, placa ABC-1234/ABC1D23 via ValidationManager) — só informa; validação real continua no salvar.
   D6 região role=status anuncia "N registros" ou o estado vazio da agenda. */
(function () {
  'use strict';
  var PLATE = /^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/;
  // Mesma regra do ValidationManager (fonte da verdade) quando disponível.
  function validPlate(p) { var VM = window.ValidationManager; return VM && typeof VM.isValidMercosulOrOld === 'function' ? VM.isValidMercosulOrOld(p) : PLATE.test(String(p).toUpperCase()); }
  function syncToggles(root) { (root || document).querySelectorAll('button.btn-toggle').forEach(function (b) { var v = b.classList.contains('active') ? 'true' : 'false'; if (b.getAttribute('aria-pressed') !== v) b.setAttribute('aria-pressed', v); }); }
  function syncTabs(root) { (root || document).querySelectorAll('.tab[data-dia]').forEach(function (t) { if (t.classList.contains('active')) { if (t.getAttribute('aria-current') !== 'date') t.setAttribute('aria-current', 'date'); } else if (t.hasAttribute('aria-current')) t.removeAttribute('aria-current'); }); }
  function rule(input) { var f = input.getAttribute('data-field'); var v = String(input.value || '').trim(); if (f === 'nome') return v && v.length < 3 ? 'Nome deve ter pelo menos 3 caracteres.' : ''; if (f === 'placa') return v && !validPlate(v.split(' ')[0]) ? 'Placa no formato ABC-1234 ou ABC1D23.' : ''; return ''; }
  var seq = 0;
  function check(input) {
    var msg = rule(input); var id = input.getAttribute('data-a11y-hint');
    if (!id) { id = 'a11yHint' + (++seq); input.setAttribute('data-a11y-hint', id); }
    var hint = document.getElementById(id);
    if (msg) {
      if (!hint) { hint = document.createElement('span'); hint.id = id; hint.className = 'a11y-hint'; input.insertAdjacentElement('afterend', hint); }
      hint.textContent = msg; input.setAttribute('aria-invalid', 'true');
      var d = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean); if (d.indexOf(id) < 0) { d.push(id); input.setAttribute('aria-describedby', d.join(' ')); }
    } else {
      if (hint) hint.textContent = ''; input.removeAttribute('aria-invalid');
    }
    return msg;
  }
  function describe(container) {
    if (!container) return '';
    var empty = container.querySelector('.empty-records-message'); if (empty) return empty.textContent;
    var n = container.querySelectorAll('.card[data-id]').length; return n === 1 ? '1 registro na agenda.' : n + ' registros na agenda.';
  }
  function start() {
    syncToggles(); syncTabs();
    new MutationObserver(function (ms) { var t = false, d = false; ms.forEach(function (m) { var el = m.target; if (el.classList && el.classList.contains('btn-toggle')) t = true; if (el.classList && el.classList.contains('tab')) d = true; if (m.type === 'childList') { t = d = true; } }); if (t) syncToggles(); if (d) syncTabs(); })
      .observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
    document.addEventListener('blur', function (e) { var el = e.target; if (el && el.matches && el.matches('input[data-field="nome"],input[data-field="placa"]')) check(el); }, true);
    document.addEventListener('input', function (e) { var el = e.target; if (el && el.getAttribute && el.getAttribute('aria-invalid') === 'true') check(el); }, true);
    var c = document.getElementById('cardsContainer'); if (!c) return;
    var live = document.createElement('div'); live.id = 'agendaStatus'; live.className = 'sr-only'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); c.insertAdjacentElement('beforebegin', live);
    var timer = null; var announce = function () { clearTimeout(timer); timer = setTimeout(function () { var s = describe(c); if (live.textContent !== s) live.textContent = s; }, 400); };
    new MutationObserver(announce).observe(c, { childList: true }); announce();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.A11yEnhancer = { syncToggles: syncToggles, syncTabs: syncTabs, check: check, rule: rule, describe: describe };
})();

;
/* src/ui/components/core/KomodoModal.js */
/**
 * KomodoModal.js
 *
 * Web Component leve para modais do Guardião Komodo.
 * Usa Light DOM (sem Shadow DOM) para que document.getElementById()
 * funcione normalmente em todos os scripts do app.
 */
class KomodoModal extends HTMLElement {
    constructor() {
        super();
        this._rendered = false;
    }

    connectedCallback() {
        if (!this._rendered) {
            this.render();
            this.setupEvents();
            this._rendered = true;
        }
    }

    static get observedAttributes() {
        return ['title', 'open'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'open') {
            const overlay = this.querySelector('.modal-overlay');
            if (!overlay) return;
            if (this.hasAttribute('open')) {
                overlay.classList.add('aberto');
            } else {
                overlay.classList.remove('aberto');
            }
        }
    }

    close() {
        this.removeAttribute('open');
        this.dispatchEvent(new CustomEvent('close'));
    }

    setupEvents() {
        const overlay = this.querySelector('.modal-overlay');
        if (!overlay) return;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });
        
        const closeBtn = this.querySelector('.km-btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
    }

    render() {
        const title = this.getAttribute('title') || 'Modal';
        const fragment = document.createDocumentFragment();
        while (this.firstChild) {
            fragment.appendChild(this.firstChild);
        }

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        const content = document.createElement('div');
        content.className = 'modal-content';
        const header = document.createElement('div');
        header.className = 'modal-header';
        const titleNode = document.createElement('div');
        titleNode.className = 'modal-title-text';
        titleNode.textContent = title;
        const closeButton = document.createElement('button');
        closeButton.className = 'km-btn-close';
        closeButton.type = 'button';
        closeButton.setAttribute('aria-label', 'Fechar modal');
        closeButton.textContent = '×';
        const body = document.createElement('div');
        body.className = 'modal-body';

        header.append(titleNode, closeButton);
        body.appendChild(fragment);
        content.append(header, body);
        overlay.appendChild(content);
        this.replaceChildren(overlay);
    }
}
customElements.define('komodo-modal', KomodoModal);

;
/* src/db/DatabaseService.js */
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


;
/* src/services/AuthService.js */
﻿/**
 * AuthService — backend no desktop local; autenticação local no Capacitor.
 * O servidor é a autoridade para as sessões do desktop. O modo local permanece
 * para o Android/offline e não é usado para autorizar chamadas ao backend.
 */
class AuthService {
  constructor() {
    this.SESSION_KEY = 'komodo_session';
    this.SESSION_TTL_MS = 12 * 60 * 60 * 1000;
    // Old desktop bearer tokens are no longer accepted; purge only the obsolete desktop key.
    if (this.isRemoteMode()) {
      try { localStorage.removeItem(this.SESSION_KEY); } catch {}
    }
  }

  isRemoteMode() {
    const loc = window.location;
    const hostedHttps = loc.protocol === 'https:' &&
      loc.hostname !== 'localhost' && loc.hostname !== '127.0.0.1';
    const localDesktopBackend = loc.protocol === 'http:' &&
      (loc.hostname === '127.0.0.1' || loc.hostname === 'localhost') &&
      loc.port === '32198';
    return hostedHttps || localDesktopBackend;
  }

  _bufToHex(buf) {
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  _hexToBuf(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    return bytes.buffer;
  }
  _randomSaltHex(bytes = 16) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return this._bufToHex(arr.buffer);
  }
  async _deriveHash(password, saltHex, iterations = 150000) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: this._hexToBuf(saltHex), iterations, hash: 'SHA-256' }, keyMaterial, 256);
    return this._bufToHex(bits);
  }

  async hasAnyUser() {
    if (this.isRemoteMode()) {
      const status = await window.apiService.get('/auth/status');
      return Boolean(status?.hasAdmin);
    }
    const rows = await window.dbService.query('SELECT COUNT(*) as total FROM komodo_tbl_usuarios');
    return Boolean(rows && rows[0] && Number(rows[0].total) > 0);
  }

  async createFirstAdmin(email, password, bootstrapSecret = '') {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');
    if (this.isRemoteMode()) {
      if (!cleanEmail || cleanPassword.length < 12) throw new Error('Defina um e-mail e uma senha com no mínimo 12 caracteres.');
      const secret = String(bootstrapSecret || '');
      if (secret.length < 32) throw new Error('Informe a chave de configuração válida fornecida pelo administrador do ambiente.');
      await window.apiService.post('/auth/bootstrap', { email: cleanEmail, password: cleanPassword, bootstrapSecret: secret });
      return true;
    }
    if (!cleanEmail || cleanPassword.length < 8) throw new Error('Defina um e-mail e uma senha com no mínimo 8 caracteres.');
    if (await this.hasAnyUser()) throw new Error('Já existe um administrador cadastrado.');
    const salt = this._randomSaltHex();
    const hash = await this._deriveHash(cleanPassword, salt);
    await window.dbService.insert('komodo_tbl_usuarios', {
      id: 'user_' + Date.now(), email: cleanEmail, salt, hash, papel: 'admin', criado_em: new Date().toISOString()
    });
    return true;
  }

  async login(email, password) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');
    if (this.isRemoteMode()) {
      const data = await window.apiService.post('/auth/login', { email: cleanEmail, password: cleanPassword });
      const session = {
        userId: data.user.id,
        email: data.user.email,
        role: data.user.role,
        expiresAt: data.expiresAt
      };
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      return session;
    }

    const rows = await window.dbService.query('SELECT * FROM komodo_tbl_usuarios WHERE email = ?', [cleanEmail]);
    if (!rows || rows.length === 0) throw new Error('Credenciais inválidas.');
    const user = rows[0];
    const computed = await this._deriveHash(cleanPassword, user.salt);
    if (computed !== user.hash) throw new Error('Credenciais inválidas.');
    const session = { token: this._randomSaltHex(24), userId: user.id, email: user.email, expiresAt: Date.now() + this.SESSION_TTL_MS };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    return session;
  }

  getSession() {
    try {
      const storage = this.isRemoteMode() ? sessionStorage : localStorage;
      const raw = storage.getItem(this.SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session.expiresAt || Date.now() > session.expiresAt) {
        storage.removeItem(this.SESSION_KEY);
        return null;
      }
      return session;
    } catch { return null; }
  }
  isAuthenticated() { return Boolean(this.getSession()); }

  logout() {
    try { if (window.komodoOffline) window.komodoOffline.clear().catch(() => {}); } catch (_) {} // achado 4: nada fica no aparelho após sair
    const session = this.getSession();
    if (this.isRemoteMode() && session && window.apiService) {
      // Inicia a revogação antes de apagar o token local.
      const pending = window.apiService.post('/auth/logout', {}).catch(() => null);
      sessionStorage.removeItem(this.SESSION_KEY);
      return pending;
    }
    localStorage.removeItem(this.SESSION_KEY);
    return Promise.resolve();
  }

  requireAuth(redirectTo = 'login.html') {
    if (this.isAuthenticated()) return;
    // Novo login (Fase C): a dica só existe se o flag estava ligado e houve login Supabase nesta aba (tokens ficam só em memória).
    let hint = false; try { hint = sessionStorage.getItem('kac_newlogin') === '1'; } catch (_) {}
    window.location.href = hint ? 'auth.html' : redirectTo;
  }
}
window.authService = new AuthService();


;
/* src/ui/components/ParticlesEngine.js */
/**
 * ParticlesEngine.js
 *
 * Motor único de partículas/radar de fundo, usado em login.html e index.html.
 * Antes esse código estava duplicado em dois arquivos — agora é uma fonte só.
 *
 * Uso:
 *   <canvas id="particles-canvas"></canvas>
 *   <script src="src/ui/components/ParticlesEngine.js"></script>
 *   <script> window.KomodoParticles.init('particles-canvas'); </script>
 */
window.KomodoParticles = (function () {
  function init(canvasId, options) {
    options = options || {};
    const count = options.count || 45;
    const linkDistance = options.linkDistance || 150;
    const colors = options.colors || ['rgba(194,160,87,'];

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const particles = [];
    const mouse = { x: -9999, y: -9999 };

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    function Particle() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.35;
      this.vy = (Math.random() - 0.5) * 0.35;
      this.radius = Math.random() * 2 + 0.5;
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }
    Particle.prototype.update = function () {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      const dx = this.x - mouse.x, dy = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 180) {
        this.x += dx * 0.02;
        this.y += dy * 0.02;
      }
    };
    Particle.prototype.draw = function () {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color + '0.6)';
      ctx.fill();
    };

    for (let i = 0; i < count; i++) particles.push(new Particle());

    let rafId;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDistance) {
            const opacity = (1 - dist / linkDistance) * 0.18;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = 'rgba(194,160,87,' + opacity + ')';
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      rafId = requestAnimationFrame(animate);
    }
    animate();

    return {
      stop: () => cancelAnimationFrame(rafId)
    };
  }

  return { init };
})();

;
/* src/ui/KomodoFx.js */
/* UX fase 1 (item 2): fundo animado (radar + partículas) DESLIGADO por padrão.
   Liga só se o usuário ativar (preferência local 'kac_fx'='1', não sensível) e o sistema não pedir menos movimento.
   Com aba oculta, a animação CSS pausa (classe kac-fx-paused). */
(function (root) {
  'use strict';
  var KEY = 'kac_fx';
  function reduced() { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function wanted() { try { return root.localStorage.getItem(KEY) === '1'; } catch (_) { return false; } }
  var started = false;
  function apply(canvasId, opts) {
    var on = wanted() && !reduced();
    document.body.classList.toggle('kac-fx', on);
    if (on && !started && root.KomodoParticles) { started = true; root.KomodoParticles.init(canvasId || 'particles-canvas', opts || { count: 50 }); }
    return on;
  }
  document.addEventListener('visibilitychange', function () { document.body.classList.toggle('kac-fx-paused', document.hidden); });
  root.KomodoFx = {
    init: function (canvasId, opts) {
      var on = apply(canvasId, opts);
      var box = document.getElementById('fxToggle');
      if (box) {
        box.checked = on; box.disabled = reduced();
        box.addEventListener('change', function () { try { if (box.checked) root.localStorage.setItem(KEY, '1'); else root.localStorage.removeItem(KEY); } catch (_) {} if (box.checked) apply(canvasId, opts); else root.location.reload(); });
      }
      return on;
    },
    enabled: function () { return wanted() && !reduced(); }
  };
})(window);

;
/* src/ui/LazyVendor.js */
/* UX fase 1 (item 1): bibliotecas pesadas (jsPDF ~420 KB, Chart.js ~208 KB) só são baixadas quando usadas.
   Mesmos arquivos locais de vendor/ (mesma origem, CSP inalterada). Promessa cacheada: cada script carrega no máximo 1 vez. */
(function (root) {
  'use strict';
  var cache = {};
  function load(src) {
    if (cache[src]) return cache[src];
    cache[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script'); s.src = src; s.async = false;
      s.onload = function () { resolve(); }; s.onerror = function () { delete cache[src]; reject(new Error('Falha ao carregar ' + src)); };
      document.head.appendChild(s);
    });
    return cache[src];
  }
  var PDF = ['vendor/jspdf-4.2.1/jspdf.umd.min.js', 'vendor/jspdf-autotable-5.0.8/jspdf.plugin.autotable.min.js'];
  var CHART = 'vendor/chart.js-4.5.1/chart.umd.js';
  root.KacVendor = {
    pdf: function () { if (root.jspdf && root.jspdf.jsPDF && root.jspdf.jsPDF.API && root.jspdf.jsPDF.API.autoTable) return Promise.resolve(); return load(PDF[0]).then(function () { return load(PDF[1]); }); },
    chart: function () { return root.Chart ? Promise.resolve() : load(CHART); },
    _load: load
  };
})(window);

;
/* src/ui/DayTabs.js */
/* UX fase 1 (item 4): abas de dias acessíveis. Mantém os handlers de clique existentes (init.js/AgendaNav):
   role=tab + aria-selected sincronizado com a classe .active; só a aba ativa entra no Tab (roving tabindex);
   ←/→ trocam de dia, Home/End vão ao primeiro/último, Enter/Espaço ativam. */
(function () {
  'use strict';
  function tabs(list) { return Array.prototype.slice.call(list.querySelectorAll('.tab[data-dia]')); }
  function sync(list) {
    var all = tabs(list); var any = all.some(function (t) { return t.classList.contains('active'); });
    all.forEach(function (t, i) { var on = t.classList.contains('active') || (!any && i === 0); t.setAttribute('role', 'tab'); t.setAttribute('aria-selected', t.classList.contains('active') ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; if (!t.id) t.id = 'tab-' + t.getAttribute('data-dia'); t.setAttribute('aria-controls', 'cardsContainer'); });
  }
  function init() {
    var list = document.getElementById('tabs'); if (!list) return;
    list.setAttribute('role', 'tablist'); if (!list.getAttribute('aria-label')) list.setAttribute('aria-label', 'Dias da semana');
    sync(list);
    new MutationObserver(function () { sync(list); }).observe(list, { subtree: true, attributes: true, attributeFilter: ['class'] });
    list.addEventListener('keydown', function (e) {
      var all = tabs(list); var i = all.indexOf(e.target); if (i < 0) return; var n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % all.length; else if (e.key === 'ArrowLeft') n = (i - 1 + all.length) % all.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = all.length - 1;
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); return; }
      if (n === null) return; e.preventDefault(); all[n].click(); all[n].focus();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  if (typeof module !== 'undefined') module.exports = { sync: sync };
})();

;
/* src/ui/VisitStatus.js */
/* UX fase 2 (item 5): "Chegou / Saiu" em 1 toque, com estado claro e desfazer por 10 s (pausa com mouse/foco).
   Estados (mesma coluna status 0/1/2 de sempre — sem mudança de banco): 0 Agendado → 1 Na portaria → 2 Saiu.
   Cada mudança vai à API com o status anterior ("from"): se outro aparelho mudou antes, a API responde 409 e nada é sobrescrito.
   Toda mudança (inclusive o desfazer) é auditada no servidor. DOM só via textContent. */
(function (root) {
  'use strict';
  var LABEL = ['Agendado', 'Na portaria', 'Saiu'];
  var ACTION = ['Chegou', 'Saiu', null];
  var UNDO_MS = 10000;
  function next(s) { s = Number(s) || 0; return s < 2 ? s + 1 : null; }
  function badge(s) { var b = document.createElement('span'); s = Number(s) || 0; b.className = 'status-badge status-' + s; b.textContent = LABEL[s]; return b; }
  function actionButton(item) {
    var s = Number(item.status) || 0; if (next(s) === null) return null;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'btn-status-toggle btn-status-next status-next-' + s;
    b.dataset.id = String(item.id == null ? '' : item.id); b.textContent = ACTION[s];
    b.setAttribute('aria-label', ACTION[s] + ': ' + String(item.nome || 'visita'));
    return b;
  }
  // Aviso com "Desfazer": 10 s, pausa enquanto o mouse está em cima ou o foco está dentro (WCAG 2.2.1).
  var toastTimer = null, remaining = 0, startedAt = 0;
  function toast(text, onUndo, ms) {
    var t = document.getElementById('kacToast');
    if (!t) {
      t = document.createElement('div'); t.id = 'kacToast'; t.className = 'kac-toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t);
      var pause = function () { if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; remaining = Math.max(1000, remaining - (Date.now() - startedAt)); } };
      var resume = function () { if (!t.hidden && !toastTimer && remaining > 0) arm(remaining); };
      if (t.addEventListener) { t.addEventListener('mouseenter', pause); t.addEventListener('focusin', pause); t.addEventListener('mouseleave', resume); t.addEventListener('focusout', resume); }
    }
    function hide() { t.hidden = true; t.textContent = ''; remaining = 0; if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; } }
    function arm(d) { remaining = d; startedAt = Date.now(); toastTimer = setTimeout(hide, d); }
    t.textContent = ''; var msg = document.createElement('span'); msg.textContent = text; t.appendChild(msg);
    if (onUndo) { var u = document.createElement('button'); u.type = 'button'; u.className = 'kac-toast-undo'; u.textContent = 'Desfazer'; u.addEventListener('click', function () { hide(); return onUndo(); }); t.appendChild(u); }
    t.hidden = false; if (toastTimer) clearTimeout(toastTimer); toastTimer = null; arm(ms || UNDO_MS);
    return { hide: hide, el: t };
  }
  // Atualiza só o cartão na tela (sem esperar a API nem recarregar a agenda).
  function paint(card, reg, pending) {
    if (!card || !card.querySelector) return;
    var box = card.querySelector('.status-box'); if (!box) return;
    box.textContent = ''; box.appendChild(badge(reg.status));
    var b = actionButton(reg); if (b) { if (pending) { b.disabled = true; b.setAttribute('aria-busy', 'true'); } box.appendChild(b); }
  }
  var pendingIds = {};
  // Avança 1 estado de forma OTIMISTA: tela e aviso na hora; API em seguida; erro/409 → volta o estado e avisa.
  async function advance(reg, repo, reload, btn) {
    var key = String(reg.id); if (pendingIds[key]) return null;
    var from = Number(reg.status) || 0, to = next(from); if (to === null) return null;
    var card = btn && btn.closest ? btn.closest('.card') : null;
    pendingIds[key] = true; reg.status = to; paint(card, reg, true);
    toast(String(reg.nome || 'Visita') + ': ' + LABEL[to] + '.', function () { return undo(reg, repo, reload, card, from, to); });
    try { await repo.updateStatus(reg.id, to, { from: from }); }
    catch (e) {
      reg.status = from; paint(card, reg, false); delete pendingIds[key];
      toast(e && e.status === 409 ? 'Status já alterado em outro aparelho. Agenda atualizada.' : 'Não foi possível salvar "' + LABEL[to] + '": ' + (e && e.message || 'erro') + '. Tente de novo.');
      try { await reload(); } catch (_) {} return null;
    }
    delete pendingIds[key]; paint(card, reg, false);
    Promise.resolve().then(reload).catch(function () {}); // sincroniza em segundo plano
    return to;
  }
  async function undo(reg, repo, reload, card, from, to) {
    var key = String(reg.id);
    // se a gravação original ainda está em andamento, espera ela terminar
    for (var i = 0; i < 50 && pendingIds[key]; i++) await new Promise(function (r) { setTimeout(r, 100); });
    if (Number(reg.status) !== to) return;
    pendingIds[key] = true; reg.status = from; paint(card, reg, true);
    try { await repo.updateStatus(reg.id, from, { from: to, undo: true }); toast('Desfeito: ' + LABEL[from] + '.', null, 4000); }
    catch (e) { reg.status = to; toast('Não foi possível desfazer: ' + (e && e.message || 'erro')); }
    delete pendingIds[key]; paint(card, reg, false);
    try { await reload(); } catch (_) {}
  }
  root.VisitStatus = { LABEL: LABEL, ACTION: ACTION, UNDO_MS: UNDO_MS, next: next, badge: badge, actionButton: actionButton, advance: advance, toast: toast, paint: paint, _pending: pendingIds };
  if (typeof module !== 'undefined') module.exports = root.VisitStatus;
})(typeof window !== 'undefined' ? window : globalThis);

;
/* src/ui/MobileShell.js */
/* UX fase 2: (7) barra de navegação inferior no celular, (6) seções opcionais do cadastro, (backlog) nome da empresa no cabeçalho.
   Só delega para botões que já existem (mesmos handlers, mesmas permissões). DOM só via textContent. */
(function (root) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var MAP = { 'new': 'btnOpenModal', saved: 'btnSavedVisitors', invites: 'btnInvites', alerts: 'btnAlerts', dashboard: 'btnOpenDashboard', pdf: 'btnExportPDF', config: 'btnOpenConfig', logout: 'btnLogout' };
  function nav(action) {
    if (action === 'agenda') { root.scrollTo({ top: 0, behavior: 'smooth' }); var c = $('cardsContainer'); if (c) c.focus(); return; }
    if (action === 'search') { var s = $('globalSearch'); if (s) { s.scrollIntoView({ block: 'center' }); s.focus(); } return; }
    var b = $(MAP[action]); if (b) b.click();
    var more = document.querySelector('.bn-more'); if (more) more.open = false;
  }
  // (6) abre automaticamente as seções opcionais que já têm dados (ex.: editar um registro)
  function syncSections(root2) {
    (root2 || document).querySelectorAll('details.opt-section').forEach(function (d) {
      var filled = Array.prototype.some.call(d.querySelectorAll('input:not([type=hidden]):not([type=file]), textarea, select'), function (el) { return el.tagName === 'SELECT' ? el.selectedIndex > 0 : String(el.value || '').trim() !== ''; });
      if (filled) d.open = true;
    });
  }
  function watchModal() {
    var m = $('mainModalOverlay'); if (!m) return;
    new MutationObserver(function () {
      if (m.hasAttribute('open') || m.classList.contains('aberto')) { setTimeout(function () { syncSections(m); var n = m.querySelector('[data-field="nome"]'); if (n && !n.closest('[hidden]') && n.offsetParent !== null) n.focus(); }, 50); }
    }).observe(m, { attributes: true, attributeFilter: ['open', 'class', 'style'] });
  }
  // (backlog) nome da empresa da sessão, vindo do servidor (/api/organizacao: só o nome da PRÓPRIA org)
  async function orgName() {
    var el = $('orgName'); if (!el || !root.authService || !root.apiService) return;
    try { if (!root.authService.isRemoteMode() || !root.authService.isAuthenticated()) return; var d = await root.apiService.get('/organizacao'); var n = d && typeof d.name === 'string' ? d.name.trim() : ''; if (!n) return; el.textContent = n; el.title = n; el.hidden = false; } catch (_) { /* silencioso: cabeçalho continua sem nome */ }
  }
  function init() {
    var bar = document.querySelector('.bottom-nav');
    if (bar) bar.addEventListener('click', function (e) { var b = e.target.closest('[data-nav]'); if (b) { e.preventDefault(); nav(b.getAttribute('data-nav')); } });
    watchModal(); orgName();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  root.KacMobileShell = { nav: nav, syncSections: syncSections, orgName: orgName };
  if (typeof module !== 'undefined') module.exports = root.KacMobileShell;
})(typeof window !== 'undefined' ? window : globalThis);

;
/* src/services/OcrService.js */
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

;
/* src/services/PdfExportService.js */
/**
 * PdfExportService.js
 * 
 * Desacopla a lógica de formatação e exportação de relatórios em PDF.
 * Usa as bibliotecas globais jsPDF e jspdf-autotable nativamente caso injetadas.
 */

class PdfExportService {
    /**
     * Exporta os registros do dia atual.
     * @param {Array} dailyData - Dados diários (vindas da Store)
     * @param {String} diaAtivo - String do dia atual (ex: 'qui')
     * @param {String} moduleName - 'RESIDENCIAL' ou 'EMPRESARIAL'
     */
    static exportTurnReport(dailyData, diaAtivo, moduleName = "RESIDENCIAL") {
        if (typeof window.jspdf === 'undefined') {
            alert('A biblioteca jsPDF não foi carregada no sistema offline.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18); 
        doc.text(`GUARDIÃO KOMODO - RELATÓRIO ${moduleName}`, 14, 22);
        
        doc.setFontSize(12); 
        doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} | Dia: ${diaAtivo.toUpperCase()}`, 14, 32);
        
        const head = [['Hora', 'Nome', 'Unidade', 'Tipo/Parentesco', 'Placa', 'Alerta']];
        const body = [];
        
        // Garante a ordenação temporal
        const sortedData = [...dailyData].sort((a, b) => a.hora.localeCompare(b.hora));
        
        sortedData.forEach(item => {
            const parentescoStr = item.parentesco && item.parentesco !== '-' ? ` (${item.parentesco})` : '';
            const isAlert = item.alerta ? 'SIM (RISCO)' : 'NORMAL';
            body.push([
                item.hora, 
                item.nome, 
                item.unidade, 
                item.tipo + parentescoStr, 
                item.placa, 
                isAlert
            ]);
        });

        // Caso a biblioteca autoTable tenha sido injetada (plugin do jsPDF)
        if (typeof doc.autoTable === 'function') {
            doc.autoTable({ 
                startY: 40, 
                head: head, 
                body: body, 
                theme: 'grid', 
                headStyles: { fillColor: [194, 160, 87] } 
            });
        }

        doc.save(`komodo_${moduleName.toLowerCase()}_turno.pdf`);
    }

    /**
     * Exporta um relatório analítico avançado (Fase 6).
     * Inclui metadados oficiais, contagem de incidentes e exportação massiva.
     */
    static exportAdvancedReport(dataset, reportTitle = "Relatório Geral Analítico", moduleName = "GERAL") {
        if (typeof window.jspdf === 'undefined') {
            alert('A biblioteca jsPDF não foi carregada.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape'); // Landscape para caber mais dados
        
        // Cabeçalho Oficial
        doc.setFontSize(22);
        doc.setTextColor(194, 160, 87); // Dourado Komodo
        doc.text("GUARDIÃO KOMODO ENTERPRISE", 14, 20);
        
        doc.setFontSize(14);
        doc.setTextColor(50, 50, 50);
        doc.text(reportTitle.toUpperCase(), 14, 30);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Data de Emissão: ${new Date().toLocaleString('pt-BR')} | Módulo: ${moduleName.toUpperCase()}`, 14, 38);
        
        // Totais e Incidentes
        const totalRegistros = dataset.length;
        const totalAlertas = dataset.filter(i => i.alerta === true || i.alerta === 1 || i.alerta === 'true' || i.alerta === '1').length;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Resumo: ${totalRegistros} Acessos Registrados | Incidentes / Alertas: ${totalAlertas}`, 14, 48);

        const head = [['Data', 'Hora', 'Nome', 'Unidade', 'Tipo/Parentesco', 'Placa', 'Alerta', 'Hitórico/Obs']];
        const body = [];
        
        dataset.forEach(item => {
            const parentescoStr = item.parentesco && item.parentesco !== '-' ? ` (${item.parentesco})` : '';
            const isAlert = (item.alerta === true || item.alerta === 1 || item.alerta === 'true' || item.alerta === '1') ? 'SIM (RISCO)' : 'NORMAL';
            const hist = item.historico ? item.historico.substring(0, 50) + (item.historico.length > 50 ? '...' : '') : '-';
            
            body.push([
                item.dia ? item.dia.toUpperCase() : 'N/A',
                item.hora || '00:00', 
                item.nome || '-', 
                item.unidade || '-', 
                (item.tipo || '-') + parentescoStr, 
                item.placa || '-', 
                isAlert,
                hist
            ]);
        });

        if (typeof doc.autoTable === 'function') {
            doc.autoTable({ 
                startY: 55, 
                head: head, 
                body: body, 
                theme: 'grid', 
                headStyles: { fillColor: [194, 160, 87] },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                styles: { fontSize: 9 }
            });
        }

        // Rodapé com assinatura
        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Gerado por Guardião Komodo - Core Security Engine | Página ${i} de ${pageCount}`, 14, doc.internal.pageSize.height - 10);
        }

        doc.save(`komodo_${moduleName.toLowerCase()}_relatorio_avancado.pdf`);
    }
}

window.PdfExportService = PdfExportService;

;
/* src/services/KomodoCopilot.js */
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
      if (loader) loader.textContent = String(e.message || 'Assistente de IA indisponível no momento.');
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

;
/* src/ui/DashboardManager.js */
/**
 * DashboardManager.js
 * 
 * Controlador isolado para gerenciar as visualizações de Dashboard (Chart.js).
 * Escuta atualizações no AppStore para se manter em sincronia.
 */

class DashboardManager {
    constructor() {
        this.chartTiposInstance = null;
        this.chartHorariosInstance = null;
        this._bindEvents();
    }

    _bindEvents() {
        if (!window.eventBus || !window.SystemEvents) return;
        
        // Mantém os gráficos atualizados passivamente
        window.eventBus.on('STORE_VISITORS_UPDATED', (state) => {
            const overlay = document.getElementById('dashModalOverlay');
            // Só redesenha se o dashboard estiver aberto; o estado inicial agora vem de CSS externo.
            const isOpen = overlay && (overlay.tagName.toLowerCase() === 'komodo-modal'
                ? overlay.hasAttribute('open')
                : (typeof window.getComputedStyle === 'function'
                    ? window.getComputedStyle(overlay).display !== 'none'
                    : overlay.classList.contains('aberto')));
            if (isOpen) this.renderDashboard(state.dailyData);
        });
    }

    /**
     * Calcula as métricas matemáticas e engatilha o Chart.js
     * @param {Array} dataset - Dados analíticos completos
     */
    renderDashboard(dataset) {
        if (!dataset) return;
        
        const tiposCount = { 'Morador': 0, 'Visitante': 0, 'Prestador': 0, 'Delivery': 0, 'Outros': 0 };
        const horariosCount = { 'Manhã (06-12)': 0, 'Tarde (12-18)': 0, 'Noite (18-24)': 0 };
        const alertasCount = { 'Normal': 0, 'Alerta de Risco': 0 };
        const fluxosCount = {};

        dataset.forEach(item => {
            const t = (item.tipo || '').toLowerCase();
            if (t.includes('morador')) tiposCount['Morador']++;
            else if (t.includes('visitante')) tiposCount['Visitante']++;
            else if (t.includes('prestador') || t.includes('manutenção')) tiposCount['Prestador']++;
            else if (t.includes('delivery')) tiposCount['Delivery']++;
            else tiposCount['Outros']++;
            
            const horaStr = item.hora || '00:00';
            const h = parseInt(horaStr.split(':')[0]) || 0;
            
            if (h >= 6 && h < 12) horariosCount['Manhã (06-12)']++;
            else if (h >= 12 && h < 18) horariosCount['Tarde (12-18)']++;
            else horariosCount['Noite (18-24)']++;

            // Fase 6: Incidentes
            const isAlerta = (item.alerta === true || item.alerta === 1 || item.alerta === 'true' || item.alerta === '1');
            if (isAlerta) alertasCount['Alerta de Risco']++;
            else alertasCount['Normal']++;

            // Fase 6: Fluxo Semanal (agrupado por dia, se aplicável)
            const d = (item.dia || 'N/A').toUpperCase();
            if (!fluxosCount[d]) fluxosCount[d] = 0;
            fluxosCount[d]++;
        });

        if (this.chartTiposInstance) this.chartTiposInstance.destroy();
        if (this.chartHorariosInstance) this.chartHorariosInstance.destroy();
        if (this.chartAlertasInstance) this.chartAlertasInstance.destroy();
        if (this.chartFluxoInstance) this.chartFluxoInstance.destroy();
        
        if (typeof window.Chart !== 'undefined') {
            const Chart = window.Chart;
            Chart.defaults.color = '#a0a0a0'; 
            Chart.defaults.font.family = 'Poppins';
            
            const ctxTipos = document.getElementById('chartTipos');
            if (ctxTipos) {
                this.chartTiposInstance = new Chart(ctxTipos.getContext('2d'), { 
                    type: 'doughnut', 
                    data: { 
                        labels: Object.keys(tiposCount), 
                        datasets: [{ 
                            data: Object.values(tiposCount), 
                            backgroundColor: ['#22c55e', '#3b82f6', '#c2a057', '#eab308', '#a0a0a0'], 
                            borderWidth: 0 
                        }] 
                    }, 
                    options: { 
                        plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'Distribuição por Tipo', color: '#c2a057' } } 
                    } 
                });
            }
            
            const ctxHorarios = document.getElementById('chartHorarios');
            if (ctxHorarios) {
                this.chartHorariosInstance = new Chart(ctxHorarios.getContext('2d'), { 
                    type: 'bar', 
                    data: { 
                        labels: Object.keys(horariosCount), 
                        datasets: [{ 
                            label: 'Acessos', 
                            data: Object.values(horariosCount), 
                            backgroundColor: '#c2a057', 
                            borderRadius: 4 
                        }] 
                    }, 
                    options: { 
                        scales: { y: { beginAtZero: true, grid: { color: 'rgba(194,160,87,0.1)' } }, x: { grid: { display: false } } },
                        plugins: { legend: { display: false }, title: { display: true, text: 'Picos de Horários', color: '#c2a057' } } 
                    } 
                });
            }

            // Novo Gráfico de Incidentes (Alerta de Risco)
            const ctxAlertas = document.getElementById('chartAlertas');
            if (ctxAlertas) {
                this.chartAlertasInstance = new Chart(ctxAlertas.getContext('2d'), { 
                    type: 'pie', 
                    data: { 
                        labels: Object.keys(alertasCount), 
                        datasets: [{ 
                            data: Object.values(alertasCount), 
                            backgroundColor: ['#22c55e', '#ef4444'], 
                            borderWidth: 0 
                        }] 
                    }, 
                    options: { 
                        plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'Nível de Risco (Incidentes)', color: '#ef4444' } } 
                    } 
                });
            }

            // Novo Gráfico de Fluxo Semanal
            const ctxFluxo = document.getElementById('chartFluxo');
            if (ctxFluxo) {
                this.chartFluxoInstance = new Chart(ctxFluxo.getContext('2d'), { 
                    type: 'line', 
                    data: { 
                        labels: Object.keys(fluxosCount), 
                        datasets: [{ 
                            label: 'Volume de Tráfego', 
                            data: Object.values(fluxosCount), 
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59,130,246,0.1)',
                            fill: true,
                            tension: 0.4
                        }] 
                    }, 
                    options: { 
                        scales: { y: { beginAtZero: true, grid: { color: 'rgba(59,130,246,0.1)' } }, x: { grid: { display: false } } },
                        plugins: { legend: { display: false }, title: { display: true, text: 'Fluxo por Dia (Tráfego)', color: '#3b82f6' } } 
                    } 
                });
            }

        } else {
            console.warn("Chart.js não carregado. Módulo Dashboard ignorado.");
        }
    }

    async openDashboard() {
        // UX fase 1: Chart.js só é baixado ao abrir o dashboard.
        if (window.KacVendor) { try { await window.KacVendor.chart(); } catch (e) { console.warn('Chart.js indisponível:', e.message); } }
        // Mostra overlay primeiro com carregamento
        const overlay = document.getElementById('dashModalOverlay') || document.querySelector('#dashModalOverlay');
        if (overlay) {
            if (overlay.tagName.toLowerCase() === 'komodo-modal') {
                overlay.setAttribute('open', '');
            } else {
                overlay.classList.add('aberto');
                overlay.style.display = 'flex';
            }
        }
        
        // Fase 6: Ao invés de puxar apenas o dailyData do Store, busca os dados agregados globais do Repositório
        if (window.VisitorRepository) {
            try {
                const moduloAtual = window.location.pathname.includes('index') ? 'empresarial' : 'residencial';
                this.currentGlobalData = await window.VisitorRepository.getAllByModule(moduloAtual);
                this.currentModulo = moduloAtual;
                this.renderDashboard(this.currentGlobalData);
            } catch (e) {
                console.error("Erro ao carregar métricas analíticas:", e);
            }
        }
    }

    // Exporta os dados atuais do Dashboard
    async exportCurrentData() {
        if (!this.currentGlobalData || !window.PdfExportService) return;
        if (window.KacVendor) { try { await window.KacVendor.pdf(); } catch (e) { alert('Não foi possível carregar o módulo de PDF. Verifique a conexão.'); return; } }
        window.PdfExportService.exportAdvancedReport(this.currentGlobalData, "Relatório Analítico Completo", this.currentModulo.toUpperCase());
    }
}

window.dashboardManager = new DashboardManager();
window.exportAdvancedDashboardReport = () => {
    if (window.dashboardManager) {
        window.dashboardManager.exportCurrentData();
    }
};

;
/* src/ui/InlineActionHandlers.js */
/*
 * Delegated UI actions for the legacy HTML pages.
 * Keeps behavior explicit without inline event-handler attributes.
 */
(function () {
    'use strict';

    function closeModal(targetId) {
        if (!targetId) return;
        var modal = document.getElementById(targetId);
        if (!modal) return;
        if (modal.tagName && modal.tagName.toLowerCase() === 'komodo-modal') {
            modal.removeAttribute('open');
        } else {
            modal.style.display = 'none';
        }
    }

    document.addEventListener('submit', function (event) {
        if (event.target && event.target.matches('form[data-prevent-submit]')) {
            event.preventDefault();
        }
    });

    document.addEventListener('input', function (event) {
        var target = event.target;
        if (target && target.matches('input[data-uppercase]')) {
            var start = target.selectionStart;
            var end = target.selectionEnd;
            var upper = target.value.toUpperCase();
            if (target.value !== upper) {
                target.value = upper;
                if (typeof start === 'number' && typeof end === 'number') {
                    try { target.setSelectionRange(start, end); } catch (_) {}
                }
            }
        }
    });

    document.addEventListener('click', function (event) {
        var target = event.target && event.target.closest
            ? event.target.closest('[data-action]')
            : null;
        if (!target) return;

        var action = target.dataset.action;
        if (action === 'close-config' || action === 'close-dashboard') {
            closeModal(target.dataset.target);
            return;
        }

        if (action === 'export-advanced-dashboard') {
            if (typeof window.exportAdvancedDashboardReport === 'function') {
                window.exportAdvancedDashboardReport();
            } else {
                console.warn('Exportação avançada indisponível: função não carregada.');
            }
            return;
        }

        if (action === 'set-access-type') {
            var hidden = document.getElementById(target.dataset.target || '');
            if (!hidden) return;
            hidden.value = target.dataset.value || '';
            var group = target.closest('[data-group="tipoAcesso"]');
            if (group) {
                group.querySelectorAll('[data-action="set-access-type"]').forEach(function (button) {
                    button.classList.toggle('active', button === target);
                    button.setAttribute('aria-pressed', button === target ? 'true' : 'false');
                });
            }
        }
    });
})();
