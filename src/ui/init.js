/**
 * init.js
 * Lógica de inicialização de UI e eventos visuais.
 * Tudo encapsulado em DOMContentLoaded para garantir que o DOM esteja pronto.
 */
document.addEventListener('DOMContentLoaded', async function() {
    // Bloqueia acesso à tela se não houver sessão válida (ver AuthService.js).
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

    var activeType1 = 'Carro';
    var activeType2 = 'Carro';

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
    document.getElementById('modalContent').addEventListener('click', async function(e) {
        var target = e.target;

        // 1. TOGGLE BUTTONS (Visita/Cliente, Carro/Moto)
        if (target.classList.contains('btn-toggle') && target.tagName === 'BUTTON') {
            var group = target.closest('.btn-toggle-group');
            if (group) {
                var btns = group.querySelectorAll('.btn-toggle');
                for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
                target.classList.add('active');

                // Se for Carro/Moto, atualizar a lista
                var targetNum = target.getAttribute('data-target');
                if (targetNum === '1') {
                    activeType1 = target.getAttribute('data-val');
                    document.getElementById('labelDropdown1').textContent = '🔍 Buscar veículo';
                    renderBrandList('listWrapper1');
                } else if (targetNum === '2') {
                    activeType2 = target.getAttribute('data-val');
                    document.getElementById('labelDropdown2').textContent = '🔍 Buscar veículo';
                    renderBrandList('listWrapper2');
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
                // Fechar todas
                document.getElementById('dropdownPanel1').classList.remove('open');
                document.getElementById('dropdownPanel2').classList.remove('open');
                if (!isOpen) {
                    panel.classList.add('open');
                    var wrapperId = (panelId === 'dropdownPanel1') ? 'listWrapper1' : 'listWrapper2';
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
        if (target.id === 'btnCancelar') { closeModal(); return; }
        if (target.id === 'btnSalvar' || target.closest('#btnSalvar')) { 
            try {
                var modalContent = document.getElementById('modalContent');
                var formData = window.formManager ? window.formManager.serialize('form-acesso') : {};
                var nomeVal = formData.nome || '';
                var placaVal = formData.placa || '';
                var corVal = formData.cor || '';
                var acompanhantesVal = formData.acompanhantes || '0';
                var placaAcompanhanteVal = formData.placaAcomp || '';
                var corAcompanhanteVal = formData.corAcomp || '';
                
                var btnType = modalContent.querySelector('.btn-toggle-group[data-group="tipo"] .active');
                var typeStr = btnType ? btnType.getAttribute('data-val') : "Visita";
                
                if (!nomeVal || nomeVal.trim().length < 3) {
                    alert("Nome deve conter pelo menos 3 caracteres.");
                    return;
                }
                
                var state = window.appStore ? window.appStore.getState('visitors') : null;
                var currentDia = state ? state.diaAtivo : 'seg';
                
                var brandLabel1 = document.getElementById('labelDropdown1');
                var brandStr1 = brandLabel1 ? brandLabel1.innerText.replace('✔️ ', '').replace('🔍 Buscar veículo', 'Sem Veículo') : 'Sem veículo';
                var finalPlaca = placaVal ? placaVal + (corVal ? ' - ' + corVal : '') + ' (' + brandStr1 + ')' : 'Sem veículo';

                var brandLabel2 = document.getElementById('labelDropdown2');
                var brandStr2 = brandLabel2 ? brandLabel2.innerText.replace('✔️ ', '').replace('🔍 Buscar veículo', 'Sem Veículo') : 'Sem veículo';
                var finalPlacaAcompanhante = placaAcompanhanteVal ? placaAcompanhanteVal + (corAcompanhanteVal ? ' - ' + corAcompanhanteVal : '') + ' (' + brandStr2 + ')' : '';

                var histVal = formData.historico || ("Registro adicionado em " + new Date().toLocaleDateString('pt-BR'));

                var novoRegistro = {
                    id: Date.now().toString(),
                    modulo: 'empresarial',
                    dia: currentDia,
                    hora: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
                    nome: nomeVal,
                    tipo: typeStr,
                    unidade: '',
                    placa: finalPlaca,
                    acompanhantes: acompanhantesVal,
                    placaAcompanhante: finalPlacaAcompanhante,
                    historico: histVal,
                    alerta: 0,
                    status: 0
                };
                // Visitante salvo: guarda placa/cor/marca separadas para preencher a próxima visita (nada de documento).
                var remember = document.getElementById('svRemember');
                novoRegistro.salvar = !remember || remember.checked;
                novoRegistro.visitante = { placa: placaVal, cor: corVal, marca: brandStr1 === 'Sem Veículo' || brandStr1 === 'Sem veículo' ? '' : brandStr1, tipo: typeStr };
                
                var saveButton = document.getElementById('btnSalvar');
                saveButton.disabled = true;
                saveButton.textContent = 'Salvando...';

                await window.VisitorRepository.save(novoRegistro);
                closeModal();
                window.formManager.clear('form-acesso');
                if (remember) remember.checked = true;
                var svNote = document.getElementById('svNote'); if (svNote) { svNote.textContent = ''; svNote.hidden = true; }
                document.getElementById('labelDropdown1').textContent = '🔍 Buscar veículo';
                document.getElementById('labelDropdown2').textContent = '🔍 Buscar veículo';
                if (window.renderController) await window.renderController.reloadDailyData(currentDia, 'empresarial');
                alert('Cadastro salvo com sucesso.');
                saveButton.disabled = false;
                saveButton.textContent = 'Salvar Registro';
                /*
                window.VisitorRepository.save(novoRegistro).then(function() {
                    closeModal();
                    
                    // Limpar formulário
                    var allInputs = document.querySelectorAll('#modalContent .form-control');
                    for(var i=0; i<allInputs.length; i++) {
                        if(allInputs[i].tagName === 'SELECT') allInputs[i].selectedIndex = 0;
                        else allInputs[i].value = '';
                    }
                    document.getElementById('labelDropdown1').textContent = '🔍 Buscar veículo';
                    document.getElementById('labelDropdown2').textContent = '🔍 Buscar veículo';
                    
                    // Recarregar dados na tela
                    if (window.renderController) window.renderController.reloadDailyData(currentDia, 'empresarial');
                }).catch(function(err) {
                    alert("Falha ao salvar no banco: " + err.message);
                }); */
            } catch(err) {
                alert("Erro inesperado no salvamento: " + err.message);
                var failedSaveButton = document.getElementById('btnSalvar');
                if (failedSaveButton) {
                    failedSaveButton.disabled = false;
                    failedSaveButton.textContent = 'Salvar Registro';
                }
            }
            return; 
        }
    });

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
            document.getElementById('dropdownPanel1').classList.remove('open');
            document.getElementById('dropdownPanel2').classList.remove('open');
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
    
    document.getElementById('mainModalOverlay').addEventListener('close', closeModal);

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

    // ==================================================
    // DADOS E AGENDA - REATIVIDADE FASE 4
    // ==================================================
    
    // O banco de dados agora é gerenciado pelo VisitorRepository (Fase 2)
    // O estado visual é gerenciado pelo AppStore (Fase 1 e 4)
    // A renderização é orquestrada pelo RenderController (Fase 4)
    
    var diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    var diaAtual = window.KomodoDate ? window.KomodoDate.todayKey() : diasSemana[new Date().getDay()];
    var allTabs = document.querySelectorAll('.tab');
    // diaAtivo fica agora encapsulado na Store, usamos apenas para inicializar
    
    // (A formatação de datas e nomes agora é feita pelo RenderController.js para ambas as telas)

    // Selecionar tab do dia atual
    var tabAtual = document.querySelector('.tab[data-dia="' + diaAtual + '"]');
    if(tabAtual) {
        for(var i=0; i<allTabs.length; i++) allTabs[i].classList.remove('active');
        tabAtual.classList.add('active');
    }
    
    // Inicializa a carga diária via Controller Reativo (Fase 4)
    if (window.renderController) {
        window.renderController.reloadDailyData(diaAtual, 'empresarial');
    }

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
            window.renderController.reloadDailyData(newDia, 'empresarial');
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
            if ('empresarial' === 'residencial') {
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
                extra.textContent = ' (' + (('empresarial' === 'residencial') ? String(item.dia || '').toUpperCase() + (item.data ? ' ' + String(item.data).split('-').reverse().join('/') : '') : 'Agendado p/ ' + String(item.dia || '').toUpperCase() + (item.data ? ' ' + String(item.data).split('-').reverse().join('/') : '')) + ')';
                name.appendChild(extra);
            }
            header.appendChild(name);
            if ('empresarial' === 'residencial') {
                var unit = document.createElement('span');
                unit.className = 'unit-badge';
                unit.appendChild(document.createTextNode('🏠 '));
                appendHighlighted(unit, item.unidade);
                header.appendChild(unit);
            }
            card.appendChild(header);

            if ('empresarial' === 'residencial') {
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
                if (window.renderController) window.renderController.reloadDailyData(state.diaAtivo, 'empresarial');
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
                await window.VisitStatus.advance(reg, window.VisitorRepository, async function () { if (window.renderController) await window.renderController.reloadDailyData(state.diaAtivo, 'empresarial'); }, btnStatus);
            }
        }
    });

    // Debounce Helper
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Busca global
    document.getElementById('globalSearch').addEventListener('input', debounce(async function() {
        var state = window.appStore ? window.appStore.getState('visitors') : null;
        if (!state) return;
        var term = this.value.toLowerCase().trim();
        if (term) {
            var all = document.querySelectorAll('.tab');
            for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
            var source = state.dailyData;
            try { source = await window.VisitorRepository.getAllByModule('empresarial'); } catch (e) { source = state.dailyData; }
            var filtered = (source || []).filter(function(item) {
                return Object.values(item).some(function(v) { return String(v).toLowerCase().indexOf(term) !== -1; });
            });
            window.renderDaily(filtered, term);
        } else {
            var tabs = document.querySelectorAll('.tab');
            for (var i = 0; i < tabs.length; i++) { if (tabs[i].getAttribute('data-dia') === state.diaAtivo) tabs[i].classList.add('active'); }
            window.renderDaily(state.dailyData);
        }
    }, 300));

    // Cadastro completo: ao digitar o nome, sugere visitantes salvos e preenche tipo, veículo e observação.
    (function wireModalSaved() {
        var nomeInput = document.getElementById('idxF1');
        if (!nomeInput || !window.KacSavedVisitors) return;
        var note = document.getElementById('svNote');
        window.KacSavedVisitors.attach(nomeInput, { modulo: 'empresarial', onPick: function(r) {
            var group = document.querySelector('#modalContent .btn-toggle-group[data-group="tipo"]');
            if (group && r.tipo) {
                var want = /cliente/i.test(r.tipo) ? 'Cliente' : 'Visita';
                group.querySelectorAll('.btn-toggle').forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-val') === want); });
            }
            var f = document.getElementById('form-acesso');
            var set = function(field, v) { var i = f && f.querySelector('[data-field="' + field + '"]'); if (i && v) { i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); } };
            set('placa', r.placa); set('cor', r.cor);
            if (r.marca) { var lb = document.getElementById('labelDropdown1'); if (lb) lb.textContent = '✔️ ' + r.marca; }
            if (r.placa) { var det = f && f.querySelector('[data-field="placa"]'); det = det && det.closest('details'); if (det) det.open = true; }
            if (note) { note.textContent = r.observacao ? 'Observação salva: ' + r.observacao : 'Dados do visitante salvo preenchidos. Confira antes de salvar.'; note.hidden = false; }
        } });
    })();

    // Autocomplete do agendamento rápido
    var quickInput = document.getElementById('quickInput');
    var quickAddModule = document.getElementById('quickAddModule');
    var quickDropdown = document.getElementById('quickDropdown');

    var historyCache = null;
    async function loadHistory() {
        if (historyCache) return historyCache;
        try { historyCache = await window.VisitorRepository.getAllByModule('empresarial'); }
        catch (e) { var st = window.appStore ? window.appStore.getState('visitors') : null; return st ? st.dailyData : []; }
        return historyCache;
    }
    if (window.eventBus && window.SystemEvents) window.eventBus.on(window.SystemEvents.DB_SAVE_SUCCESS, function() { historyCache = null; });

    // Sugestão de visitantes salvos (servidor, por empresa). Sem conta online/sem rede: usa o histórico local como antes.
    function historyFallback(term) {
        term = String(term || '').toLowerCase();
        return loadHistory().then(function(database) {
            var mapS = {};
            (database || []).forEach(function(p) { var n = String(p.nome || ''); if (n.toLowerCase().indexOf(term) !== -1) mapS[n.toLowerCase()] = { nome: n, tipo: p.tipo, placa: '', visits_count: 0, _visit: p }; });
            return Object.values(mapS);
        });
    }
    var quickSaved = window.KacSavedVisitors ? window.KacSavedVisitors.attach(quickInput, { modulo: 'empresarial', listbox: quickDropdown, host: quickAddModule, fallback: historyFallback }) : null;
    document.addEventListener('click', function(e) {
        if (!quickAddModule.contains(e.target)) quickAddModule.classList.remove('active');
    });

    document.getElementById('btnQuickAdd').addEventListener('click', async function() {
        var state = window.appStore ? window.appStore.getState('visitors') : null;
        var database = await loadHistory();
        var nome = quickInput.value.trim();
        var hora = document.getElementById('quickTime').value || "00:00";
        if (!nome) { alert('Digite um nome ou selecione da lista.'); return; }
        
        var saved = quickSaved ? quickSaved.picked() : null;
        if (saved && saved._visit) saved = null;
        var found = null;
        if (!saved) {
            for(var i = database.length - 1; i >= 0; i--) {
                if (String(database[i].nome || '').toLowerCase() === nome.toLowerCase()) { found = database[i]; break; }
            }
        }
        
        var newRecord = {
            id: Date.now().toString(),
            modulo: 'empresarial',
            dia: state.diaAtivo,
            hora: hora,
            nome: nome,
            unidade: '',
            tipo: saved ? (saved.tipo || 'Visita') : found ? found.tipo : "Visitante",
            placa: saved ? window.KacSavedVisitors.composePlaca(saved) : found ? found.placa : "Sem Veículo",
            acompanhantes: found ? found.acompanhantes : "0",
            placaAcompanhante: found ? found.placaAcompanhante : "",
            historico: saved && saved.observacao ? saved.observacao : found ? found.historico : "Adicionado via Agendamento Rápido",
            alerta: found ? found.alerta : 0,
            status: 0
        };
        if (saved) newRecord.visitante = { placa: saved.placa || '', cor: saved.cor || '', marca: saved.marca || '', tipo: saved.tipo || '' };
        
        try {
            await window.VisitorRepository.save(newRecord);
            if (window.renderController) window.renderController.reloadDailyData(state.diaAtivo, 'empresarial');
            
            quickInput.value = '';
            if (quickSaved) quickSaved.clear();
            quickAddModule.classList.remove('active');
            alert('Registro Adicionado com Sucesso!');
        } catch(err) {
            alert("Erro ao salvar: " + err.message);
        }
    });

    // Função exposta para a IA preencher o modal de cadastro (Empresarial)
    window.fillFormWithAI = function(data) {
        if (!data) return;
        
        var modalContent = document.getElementById('modalContent');
        if (!modalContent) return;
        
        // Abre o modal se não estiver aberto
        document.getElementById('mainModalOverlay').setAttribute('open', '');
        
        var inputs = modalContent.querySelectorAll('.form-control');
        
        if (data.nome && inputs[0]) inputs[0].value = data.nome;
        if (data.placa && inputs[1]) inputs[1].value = data.placa;
        if (data.cor && inputs[2]) inputs[2].value = data.cor;
        
    };

    // ==================================================
    // FASE 4: EXPORTAÇÃO PDF & DASHBOARD ANALYTICS
    // ==================================================
    document.getElementById('btnExportPDF').addEventListener('click', async function() {
        // UX fase 1: jsPDF só é baixado agora (não no carregamento da agenda).
        try { if (window.KacVendor) await window.KacVendor.pdf(); } catch (e) { alert('Não foi possível carregar o módulo de PDF. Verifique a conexão.'); return; }
        if(typeof window.PdfExportService !== 'undefined') {
            const state = window.appStore ? window.appStore.getState('visitors') : null;
            const dailyData = state ? state.dailyData : [];
            const diaAtivo = state ? state.diaAtivo : diaAtual;
            window.PdfExportService.exportTurnReport(dailyData, diaAtivo, "EMPRESARIAL");
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

    // ==================================================
    // KOMODO AI ASSISTANT E CONFIGURAÇÕES
    // ==================================================
    document.getElementById('btnOpenConfig').addEventListener('click', function() {
        document.getElementById('configAiProvider').value = localStorage.getItem('komodo_ai_provider') || 'groq';
        document.getElementById('configApiKey').value = '';
        document.getElementById('configModalOverlay').setAttribute('open', '');
    });

    document.getElementById('btnSaveConfig').addEventListener('click', function() {
        localStorage.setItem('komodo_ai_provider', document.getElementById('configAiProvider').value);
        document.getElementById('configModalOverlay').removeAttribute('open');
        alert('Preferências salvas neste aparelho. A IA ainda não está habilitada no servidor.');
    });

    var aiPanel = document.getElementById('aiPanel');
    var aiBody = document.getElementById('aiBody');
    var aiInput = document.getElementById('aiInput');
    var aiTyping = document.getElementById('aiTypingIndicator');

    document.getElementById('btnToggleAi').addEventListener('click', function() { aiPanel.classList.toggle('open'); setTimeout(function(){aiInput.focus();}, 100); });
    document.getElementById('btnCloseAi').addEventListener('click', function() { aiPanel.classList.remove('open'); });

    var btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async function() {
            if (window.authService) {
                try { await window.authService.logout(); } catch (e) {}
                window.location.href = 'login.html';
            }
        });
    }

    document.getElementById('btnSendAi').addEventListener('click', function() {
        if (window.komodoCopilot) {
            window.komodoCopilot.sendChatMessage();
        }
    });

    aiInput.addEventListener('keypress', function(e) { if(e.key === 'Enter') document.getElementById('btnSendAi').click(); });

    // Modificando os IDs para corresponderem ao KomodoCopilot
    document.getElementById('aiInput').id = 'chat-input';
    document.getElementById('aiBody').id = 'chat-messages';

    // Init
    // A carga inicial já foi feita via RenderController
    renderBrandList('listWrapper1');
    renderBrandList('listWrapper2');
}); // fim DOMContentLoaded
