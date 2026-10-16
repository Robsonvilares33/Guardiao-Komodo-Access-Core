
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
                btnStatus.disabled = true;
                await window.VisitStatus.advance(reg, window.VisitorRepository, async function () { if (window.renderController) await window.renderController.reloadDailyData(state.diaAtivo, 'residencial'); });
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

    quickInput.addEventListener('input', async function() {
        var term = this.value.trim().toLocaleLowerCase('pt-BR');
        if (term.length < 2) { closeQuickSuggestions(); return; }
        var requestVersion = ++quickRequestVersion;
        try {
            var allRecords = await window.VisitorRepository.getAllByModule('residencial');
            if (requestVersion !== quickRequestVersion) return;
            var uniqueByName = {};
            allRecords.forEach(function(record) {
                var name = String(record.nome || '').toLocaleLowerCase('pt-BR');
                if (name.indexOf(term) !== -1 && !uniqueByName[name]) uniqueByName[name] = record;
            });
            quickRecords = Object.keys(uniqueByName).map(function(key) { return uniqueByName[key]; });
            showQuickSuggestions(quickRecords);
        } catch (error) {
            console.error('Falha ao carregar sugestões:', error);
            quickRecords = [];
            showQuickSuggestions([]);
        }
    });

    quickDropdown.addEventListener('click', function(event) {
        var item = event.target.closest('[data-quick-index]');
        if (!item) return;
        var record = quickRecords[Number(item.dataset.quickIndex)];
        if (record) quickInput.value = record.nome;
        closeQuickSuggestions();
    });

    document.addEventListener('click', function(event) {
        if (!quickAddModule.contains(event.target)) closeQuickSuggestions();
    });

    document.getElementById('btnQuickAdd').addEventListener('click', async function() {
        var name = quickInput.value.trim();
        var time = document.getElementById('quickTime').value || '00:00';
        if (!name) { alert('Digite ou selecione o nome da pessoa.'); return; }

        var source = quickRecords.find(function(record) {
            return String(record.nome || '').toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR');
        });
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
            historico: 'Agendamento rápido criado em ' + new Date().toLocaleDateString('pt-BR'),
            alerta: source.alerta ? 1 : 0, status: 0
        };
        try {
            await window.VisitorRepository.save(recordToSave);
            quickInput.value = '';
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

    