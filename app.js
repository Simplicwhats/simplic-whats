const SUPABASE_URL = "https://kgidkxaqvgcqiqwqxvut.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnaWRreGFxdmdjcWlxd3F4dnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODc0MzAsImV4cCI6MjA5ODA2MzQzMH0.DLQoO8_q_QeW-a084ZDCFRc0OIeuEDaYpkUg2tSCB0E";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let contatos = [];
let whatsappAccounts = [];
let listaScripts = [];
let contaEditandoIndex = null;
let usuarioLogado = "";
let previewTimerInterval = null;

let filtroStatusAtual = 'todos';
let regressiveTimerPointer = null;
let segundosRestantesRegressivo = 5;

// TOAST NOTIFICATIONS FUNCTION
function showToast(mensagem, tipo = 'success') {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast";
    
    let borderColors = { success: 'var(--primary)', error: 'var(--red)', info: 'var(--blue)', warning: 'var(--orange)' };
    toast.style.borderLeftColor = borderColors[tipo] || 'var(--primary)';
    
    let icon = tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : tipo === 'warning' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${mensagem}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "fadeIn 0.3s ease reverse";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function formatRemainingTime(timestamp){
    const diff = timestamp - Date.now();
    if(diff <= 0) return "Liberado";
    const horas = Math.floor((diff % 86400000) / 3600000);
    const minutos = Math.floor((diff % 3600000) / 60000);
    const segundos = Math.floor((diff % 60000) / 1000);
    return `${horas}h ${minutos}m ${segundos}s`;
}

function abrirModal(id) { document.getElementById(id).classList.remove("hidden"); }
function fecharModal(id) { document.getElementById(id).classList.add("hidden"); }

function abrirModalContatos() {
    let select = document.getElementById("modalSelectScriptDefinido");
    select.innerHTML = "";
    if(listaScripts.length === 0) {
        select.innerHTML = `<option value="">⚠️ Crie um script primeiro!</option>`;
    } else {
        listaScripts.forEach((s, idx) => {
            select.innerHTML += `<option value="${idx}">${s.nome}</option>`;
        });
    }
    abrirModal("modalContatos");
}

function toggleTempoRestritoVisibilidade() {
    let status = document.getElementById("editModalStatus").value;
    document.getElementById("containerTempoRestrito").classList.toggle("hidden", status !== "restrito");
}

async function login(){
    let userField = document.getElementById("user");
    let passField = document.getElementById("pass");

    // Validação de segurança caso os elementos sumam do DOM
    if (!userField || !passField) {
        showToast("Erro crítico: Campos de login não encontrados.", "error");
        return;
    }

    let userDigitado = userField.value.trim();
    let passDigitadoAtual = passField.value.trim(); 

    if (userDigitado === "Levi" && passDigitadoAtual === "2104") {
        usuarioLogado = "Levi";
    } else if (userDigitado === "Mariana" && passDigitadoAtual === "123mudar") {
        usuarioLogado = "Mariana";
    } else if (userDigitado === "Maria" && passDigitadoAtual === "duda2025") {
        usuarioLogado = "Maria";
        } else if (userDigitado === "Jeferson" && passDigitadoAtual === "1234") {
        usuarioLogado = "Jeferson";
        } else if (userDigitado === "Supremorsrs" && passDigitadoAtual === "1234") {
        usuarioLogado = "Supremorsrs";
    } else {
        showToast("Login ou senha incorretos!", "error");
        return;
    } 
    
    sessionStorage.setItem("_ss_op", btoa(usuarioLogado));
    document.getElementById("lblUsuario").innerText = usuarioLogado;
    document.getElementById("login").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    
    showToast(`Bem-vindo de volta, ${usuarioLogado}!`, "success");
    await syncLoadAll();
}

function logout() {
    usuarioLogado = "";
    sessionStorage.clear();
    fecharMiniPlayer();
    document.getElementById("app").classList.add("hidden");
    document.getElementById("login").classList.remove("hidden");
    showToast("Sessão encerrada com sucesso.");
}

async function syncLoadAll() {
    if(!usuarioLogado) return;
    try {
        let resWa = await supabaseClient.from('whatsapp_accounts').select('*').eq('operator_name', usuarioLogado).order('id', { ascending: true });
        whatsappAccounts = resWa.data || [];

        let resScr = await supabaseClient.from('message_scripts').select('*').eq('operator_name', usuarioLogado).order('id', { ascending: true });
        listaScripts = resScr.data || [];

        let resCon = await supabaseClient.from('contacts_queue').select('*').eq('operator_name', usuarioLogado).order('id', { ascending: true });
        contatos = resCon.data || [];

        renderKPIs();
        renderWA();
        renderScripts();
        filtrarEBuscarFila();
    } catch (error) {
        console.error("Erro na sincronização:", error);
    }
}

function renderKPIs() {
    document.getElementById("kpiTotalFila").innerText = contatos.length;
    document.getElementById("kpiEnviados").innerText = contatos.filter(c => c.status === "Enviado").length;
    document.getElementById("kpiAtivos").innerText = whatsappAccounts.filter(w => w.status === "ativo").length;
    document.getElementById("kpiRestritos").innerText = whatsappAccounts.filter(w => w.status === "restrito" || w.status === "banido").length;
}

function limparEValidarTelefone(tel) {
    let limpo = tel.replace(/\D/g, "");
    if (limpo.length === 11 && limpo.startsWith("9")) {
        limpo = "55" + limpo;
    } else if (limpo.length === 11 && !limpo.startsWith("55")) {
        limpo = "55" + limpo;
    } else if (limpo.length === 9) {
        limpo = "5511" + limpo;
    }
    return limpo;
}

async function addWA(){
    let num = document.getElementById("waNumber").value.trim();
    let role = document.getElementById("waRole").value;
    let browser = document.getElementById("waBrowser").value;
    if(!num) return showToast("Digite um número válido", "warning");

    num = limparEValidarTelefone(num);
    let isFirst = whatsappAccounts.length === 0;

    await supabaseClient.from('whatsapp_accounts').insert([{
        operator_name: usuarioLogado,
        number: num,
        sent: 0,
        selected: isFirst,
        status: "ativo",
        role: role,
        browser: browser
    }]);

    document.getElementById("waNumber").value = "";
    showToast("Nova instância conectada!");
    await syncLoadAll();
}

function renderWA(){
    let html = "";
    whatsappAccounts.forEach((w, i)=>{
        let color = "#10b981";
        let statusText = w.status;
        let alarmTag = "";

        if (w.sent >= 50) {
            alarmTag = `<span class="badge-info safety-alert">⚠️ AQUECIMENTO MÁXIMO (${w.sent}/50)</span>`;
        }

        if(w.status === "restrito"){
            color = "#f59e0b";
            if(w.restricted_until) statusText = "restrito: " + formatRemainingTime(Number(w.restricted_until));
        }
        if(w.status === "banido") color = "#ef4444";

        let roleLabels = { preventive: "Preventivo", acoes: "Ações", reserva: "Reserva" };
        let roleColors = { preventive: "#3b82f6", acoes: "#ef4444", reserva: "#f59e0b" };
        let currentRole = w.role || "preventive";

        html += `
        <div class="row" style="align-items: flex-start; padding: 14px 8px;">
            <div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <input type="radio" name="wa" class="radio-custom" onchange="selectWA(${w.id})" ${w.selected ? "checked" : ""}>
                    <span style="cursor:pointer; font-weight:600;" onclick="abrirEditarModal(${i})">${w.number}</span>
                    <span class="small">(${w.sent} envios)</span>
                    ${alarmTag}
                </div>
                <div style="margin-left: 26px; display: flex; gap: 6px;">
                    <span class="badge-info" style="background: ${roleColors[currentRole]}20; color: ${roleColors[currentRole]}; border: 1px solid ${roleColors[currentRole]}30;">${roleLabels[currentRole]}</span>
                </div>
            </div>
            <div class="action-buttons">
                <span id="badge-status-${i}" class="badge-status" style="background: ${color}20; color: ${color}; border: 1px solid ${color}40;">${statusText}</span>
                <select class="select-status-inline" onchange="alterarStatusRapido(${w.id}, ${i}, this.value)">
                    <option value="ativo" ${w.status === 'ativo' ? 'selected' : ''}>Ativo</option>
                    <option value="restrito" ${w.status === 'restrito' ? 'selected' : ''}>Restrito</option>
                    <option value="banido" ${w.status === 'banido' ? 'selected' : ''}>Banido</option>
                </select>
                <button onclick="abrirEditarModal(${i})" class="btn-icon" style="color:#3b82f6;">📝</button>
                <button onclick="removeWA(${w.id})" class="btn-icon" style="color:#ef4444;">✕</button>
            </div>
        </div>`;
    });
    document.getElementById("waList").innerHTML = html;
}

async function selectWA(id){
    await supabaseClient.from('whatsapp_accounts').update({ selected: false }).eq('operator_name', usuarioLogado);
    await supabaseClient.from('whatsapp_accounts').update({ selected: true }).eq('id', id);
    showToast("Instância de disparo alterada.");
    await syncLoadAll();
}

async function alterarStatusRapido(id, i, statusAlvo) {
    if(statusAlvo === "restrito") {
        abrirEditarModal(i);
        document.getElementById("editModalStatus").value = "restrito";
        toggleTempoRestritoVisibilidade();
    } else {
        await supabaseClient.from('whatsapp_accounts').update({ status: statusAlvo, restricted_until: null }).eq('id', id);
        showToast("Status updated.");
        await syncLoadAll();
    }
}

function abrirEditarModal(i) {
    contaEditandoIndex = i;
    let conta = whatsappAccounts[i];
    document.getElementById("editModalNumero").value = conta.number;
    document.getElementById("editModalSent").value = conta.sent;
    document.getElementById("editModalStatus").value = conta.status;
    document.getElementById("editModalRole").value = conta.role || "preventive";
    document.getElementById("editModalBrowser").value = conta.browser || "chrome";
    toggleTempoRestritoVisibilidade();
    
    document.getElementById("btnSalvarEdicao").onclick = async function() {
        let novoNumero = limparEValidarTelefone(document.getElementById("editModalNumero").value.trim());
        let novosAcionamentos = parseInt(document.getElementById("editModalSent").value.trim());
        let novoStatus = document.getElementById("editModalStatus").value;
        let novaRole = document.getElementById("editModalRole").value;
        let novoBrowser = document.getElementById("editModalBrowser").value;
        
        let restUntilValue = null;
        if(novoStatus === "restrito") {
            let inputTempo = document.getElementById("editModalTempo").value;
            if(inputTempo) {
                let milissegundosTotais = parseFloat(inputTempo) * 3600000;
                if(milissegundosTotais > 0) restUntilValue = Date.now() + milissegundosTotais;
            }
        }
        
        await supabaseClient.from('whatsapp_accounts').update({
            number: novoNumero,
            sent: novosAcionamentos,
            status: novoStatus,
            role: novaRole,
            browser: novoBrowser,
            restricted_until: restUntilValue
        }).eq('id', conta.id);

        fecharModal("modalEditar");
        showToast("Alterações salvas com sucesso!");
        await syncLoadAll();
    };
    abrirModal("modalEditar");
}

async function removeWA(id){
    if(!confirm("Remover esta conta?")) return;
    await supabaseClient.from('whatsapp_accounts').delete().eq('id', id);
    showToast("Instância desconectada.", "warning");
    await syncLoadAll();
}

function mudarFiltroLista(statusAlvo) {
    filtroStatusAtual = statusAlvo;
    let abas = ['filterTabAll', 'filterTabPendente', 'filterTabEnviado', 'filterTabErro'];
    abas.forEach(a => document.getElementById(a).classList.remove('active'));
    
    if(statusAlvo === 'todos') document.getElementById('filterTabAll').classList.add('active');
    else if(statusAlvo === 'Pendente') document.getElementById('filterTabPendente').classList.add('active');
    else if(statusAlvo === 'Enviado') document.getElementById('filterTabEnviado').classList.add('active');
    else if(statusAlvo === 'Erro') document.getElementById('filterTabErro').classList.add('active');

    filtrarEBuscarFila();
}

function filtrarEBuscarFila() {
    let termoBusca = document.getElementById("buscaContatoInput").value.trim().toLowerCase();
    let listaFiltrada = contatos;

    if (filtroStatusAtual !== 'todos') {
        listaFiltrada = listaFiltrada.filter(c => c.status === filtroStatusAtual);
    }

    if (termoBusca) {
        listaFiltrada = listaFiltrada.filter(c => 
            c.tel.toLowerCase().includes(termoBusca) || 
            (c.script_texto && c.script_texto.toLowerCase().includes(termoBusca))
        );
    }

    renderContatos(listaFiltrada);
}

function renderContatos(dadosFila) {
    let html = "";
    if (dadosFila.length === 0) {
        html = `<div class="small" style="text-align:center; padding:30px; color:var(--text-muted);">Nenhum número correspondente encontrado.</div>`;
        document.getElementById("lista").innerHTML = html;
        return;
    }

    dadosFila.forEach((c) => {
        let badgeColor = c.status === 'Enviado' ? 'var(--blue)' : c.status === 'Erro' ? 'var(--red)' : 'var(--text-muted)';
        
        // Geração do seletor inline de scripts para troca rápida
        let scriptOptions = listaScripts.map(s => `<option value="${s.id}" ${c.script_nome === s.nome ? 'selected' : ''}>${s.nome}</option>`).join('');

        html += `
        <div class="row" style="padding: 10px 6px;">
            <div>
                <span style="font-weight:600; color:#fff;">${c.tel}</span>
                <div class="small" style="color: var(--purple); font-size:11px; margin-top:2px; display:flex; align-items:center; gap:4px;">
                    📋 Script: 
                    <select onchange="alterarScriptContatoFila(${c.id}, this.value)" style="width:auto; padding:2px; margin:0; font-size:11px; height:22px; background:rgba(0,0,0,0.4); border-radius:4px;">
                        ${scriptOptions || '<option>Nenhum cadastrado</option>'}
                    </select>
                </div>
            </div>
            <div class="action-buttons">
                <select class="select-status-inline" onchange="atualizarStatusContatoManual(${c.id}, this.value)" style="background-color: rgba(0,0,0,0.3); border-color: ${badgeColor}; color: #fff;">
                    <option value="Pendente" ${c.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="Enviado" ${c.status === 'Enviado' ? 'selected' : ''}>Enviado</option>
                    <option value="Erro" ${c.status === 'Erro' ? 'selected' : ''}>Erro / Sem Whats</option>
                </select>
                <button onclick="removerContatoFila(${c.id})" class="btn-icon" style="color:#ef4444;">✕</button>
            </div>
        </div>`;
    });
    document.getElementById("lista").innerHTML = html;
}

// TROCA DINÂMICA DE SCRIPT DO NÚMERO
async function alterarScriptContatoFila(contatoId, scriptId) {
    let scriptObj = listaScripts.find(s => s.id == scriptId);
    if (!scriptObj) return;

    await supabaseClient.from('contacts_queue').update({
        script_nome: scriptObj.nome,
        script_texto: scriptObj.texto
    }).eq('id', contatoId);

    showToast("Script do contato updated.");
    await syncLoadAll();
}

async function atualizarStatusContatoManual(id, novoStatus) {
    await supabaseClient.from('contacts_queue').update({ status: novoStatus }).eq('id', id);
    showToast(`Contato marcado como ${novoStatus}`);
    await syncLoadAll();
}

async function salvarContatos(){
    let scriptIdx = document.getElementById("modalSelectScriptDefinido").value;
    if(scriptIdx === "") return showToast("Selecione um script válido.", "warning");
    
    let scriptVinculado = listaScripts[scriptIdx];
    let rawInput = document.getElementById("telefonesInputModal").value;
    let listagemNovos = rawInput.split("\n").map(x => x.trim()).filter(x => x);

    let packageData = listagemNovos.map(linha => {
        let partes = linha.split(";");
        let numeroLimpo = limparEValidarTelefone(partes[0]);
        let nomeCliente = partes[1] ? partes[1].trim() : "";
        let textoCustomizado = scriptVinculado.texto.replace(/\{nome\}/gi, nomeCliente || "");

        return {
            operator_name: usuarioLogado,
            tel: numeroLimpo,
            status: "Pendente",
            script_texto: textoCustomizado, 
            script_nome: scriptVinculado.nome
        };
    });

    await supabaseClient.from('contacts_queue').insert(packageData);
    fecharModal("modalContatos");
    showToast(`${packageData.length} Contatos adicionados.`);
    await syncLoadAll();
}

async function limparContatos(){
    if(!confirm("Remover permanentemente toda a fila?")) return;
    await supabaseClient.from('contacts_queue').delete().eq('operator_name', usuarioLogado);
    showToast("Fila esvaziada.", "info");
    await syncLoadAll();
}

async function removerContatoFila(id){
    await supabaseClient.from('contacts_queue').delete().eq('id', id);
    showToast("Contato excluído da lista.");
    await syncLoadAll();
}

/* SCRIPTS */
function abrirModalScriptNovo() {
    document.getElementById("tituloScriptModal").innerText = "Criar Novo Script";
    document.getElementById("editScriptId").value = ""; 
    document.getElementById("nomeScriptModal").value = "";
    document.getElementById("textoScriptModal").value = "";
    abrirModal("modalScript");
}

async function salvarScript(){
    let idExistente = document.getElementById("editScriptId").value;
    let nome = document.getElementById("nomeScriptModal").value.trim();
    let texto = document.getElementById("textoScriptModal").value.trim();
    
    if (idExistente) {
        await supabaseClient.from('message_scripts').update({ nome: nome, texto: texto }).eq('id', idExistente);
    } else {
        await supabaseClient.from('message_scripts').insert([{ operator_name: usuarioLogado, nome: nome, texto: texto, selected: listaScripts.length === 0 }]);
    }
    fecharModal("modalScript");
    showToast("Script atualizado com sucesso.");
    await syncLoadAll();
}

function renderScripts() {
    let html = "";
    if (listaScripts.length === 0) {
        document.getElementById("scriptsContainerList").innerHTML = "";
        document.getElementById("preview").innerText = "Nenhum script.";
        return;
    }
    listaScripts.forEach((s) => {
        let base64 = btoa(unescape(encodeURIComponent(s.texto)));
        html += `
        <div class="row" style="padding: 8px 6px;">
            <div style="display: flex; align-items: center; flex: 1; cursor: pointer;" onclick="selectScript(${s.id})">
                <input type="radio" name="scriptSelect" class="radio-custom" ${s.selected ? "checked" : ""}>
                <span style="font-weight: 600; color: ${s.selected ? 'var(--blue)' : '#fff'};">${s.nome}</span>
            </div>
            <div class="action-buttons">
                <button onclick="prepararEdicaoScript(${s.id}, '${s.nome}', '${base64}')" class="btn-icon" style="color:#3b82f6;">📝</button>
                <button onclick="removerScript(${s.id})" class="btn-icon" style="color:#ef4444;">✕</button>
            </div>
        </div>`;
    });
    document.getElementById("scriptsContainerList").innerHTML = html;
    let ativo = listaScripts.find(x => x.selected);
    document.getElementById("preview").innerText = ativo ? ativo.texto : "";
}

function prepararEdicaoScript(id, nome, b64) {
    document.getElementById("tituloScriptModal").innerText = "Editar Script";
    document.getElementById("editScriptId").value = id; 
    document.getElementById("nomeScriptModal").value = nome;
    document.getElementById("textoScriptModal").value = decodeURIComponent(escape(atob(b64)));
    abrirModal("modalScript");
}

async function selectScript(id) {
    await supabaseClient.from('message_scripts').update({ selected: false }).eq('operator_name', usuarioLogado);
    await supabaseClient.from('message_scripts').update({ selected: true }).eq('id', id);
    await syncLoadAll();
}

async function removerScript(id){
    if(!confirm("Deletar script?")) return;
    await supabaseClient.from('message_scripts').delete().eq('id', id);
    await syncLoadAll();
}

/* TIMER REGRESSIVO & DISPARO SEGURO */
function iniciarContagemEnvio() {
    let wa = whatsappAccounts.find(x => x.selected);
    if(!wa || wa.status === "banido") return showToast("Verifique sua instância ativa antes de enviar.", "error");

    let proximoContato = contatos.find(c => c.status === "Pendente");
    if(!proximoContato) return showToast("Nenhum contato pendente na fila.", "warning");

    cancelarEnvioRegressivo();
    segundosRestantesRegressivo = 3;
    document.getElementById("lblRegressivoSegundo").innerText = segundosRestantesRegressivo;
    document.getElementById("timerContainerBanner").classList.remove("hidden");
    document.getElementById("btnProximoChamado").disabled = true;

    regressiveTimerPointer = setInterval(async () => {
        segundosRestantesRegressivo--;
        document.getElementById("lblRegressivoSegundo").innerText = segundosRestantesRegressivo;

        if (segundosRestantesRegressivo <= 0) {
            clearInterval(regressiveTimerPointer);
            document.getElementById("timerContainerBanner").classList.add("hidden");
            document.getElementById("btnProximoChamado").disabled = false;
            await dispararProximoWhatsappEfetivo(wa, proximoContato);
        }
    }, 1000);
}

function cancelarEnvioRegressivo() {
    if(regressiveTimerPointer) clearInterval(regressiveTimerPointer);
    document.getElementById("timerContainerBanner").classList.add("hidden");
    document.getElementById("btnProximoChamado").disabled = false;
}

// ATUALIZAÇÃO AUTOMÁTICA E DISPARO SEM BLOQUEIO
async function dispararProximoWhatsappEfetivo(wa, contatoAlvo) {
    // Atualização imediata no Supabase antes de abrir o link para evitar duplicações
    await supabaseClient.from('contacts_queue').update({ status: 'Enviado' }).eq('id', contatoAlvo.id);
    await supabaseClient.from('whatsapp_accounts').update({ sent: wa.sent + 1 }).eq('id', wa.id);

    // Formatação com a URL universal da API oficial de redirecionamento do WhatsApp Web
    let urlDisparo = "https://web.whatsapp.com/send/?phone=" + contatoAlvo.tel + "&text=" + encodeURIComponent(contatoAlvo.script_texto);
    
    // Abertura forçada em nova aba sem herança de histórico para contornar restrições
    window.open(urlDisparo, "_blank");
    
    showToast("Enviado e atualizado automaticamente!");
    await syncLoadAll();
}

/* MUSIC PLAYER AUDIOFLOW & CSS EQUALIZER */
function mudarAbaMusica(aba) {
    document.getElementById("tabBtnBusca").classList.toggle("active", aba === 'busca');
    document.getElementById("tabBtnLink").classList.toggle("active", aba === 'link');
    document.getElementById("abaMusicaBusca").classList.toggle("hidden", aba !== 'busca');
    document.getElementById("abaMusicaLink").classList.toggle("hidden", aba !== 'link');
}

async function buscarMusicaPorNome() {
    let termo = document.getElementById("inputBuscaNome").value.trim();
    if (!termo) return;
    try {
        let resposta = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(termo)}&entity=song&limit=4`);
        let dados = await resposta.json();
        let htmlResultados = "";
        dados.results.forEach(faixa => {
            htmlResultados += `
            <div class="busca-item-resultado" style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid var(--border-color);">
                <div><strong>${faixa.trackName}</strong><br><span class="small">${faixa.artistName}</span></div>
                <button class="green" onclick="ejecutarAudioSessao('${faixa.previewUrl}', '${faixa.trackName}', false)" style="margin:0; padding:4px 10px;">▶</button>
            </div>`;
        });
        document.getElementById("containerResultadosBusca").innerHTML = htmlResultados;
    } catch (e) { showToast("Falha ao buscar música.", "error"); }
}

function carregarLofiPadrao() { ejecutarAudioSessao("https://stream.zeno.fm/0r0xa792kwzuv", "Rádio Lofi Chill", false); }

function carregarMusicaUrl() {
    let url = document.getElementById("inputLinkMusica").value.trim();
    if(url.includes("youtube.com") || url.includes("youtu.be")) {
        let id = url.match(/(?:v=|\/embed\/|\/\d+\/|\/vi\/|youtu\.be\/|embeds\/)([^#\&\?]*)/)[1];
        ejecutarAudioSessao(`https://www.youtube.com/embed/${id}?autoplay=1`, "YouTube Vídeo", true);
    } else {
        ejecutarAudioSessao(url, "Mídia Externa", false);
    }
}

function ejecutarAudioSessao(urlAudio, nome, isIframe) {
    let playerNativo = document.getElementById("playerAudioNativo");
    document.getElementById("lblNomeMusicaTocando").innerText = nome;
    document.getElementById("containerMiniPlayer").classList.remove("hidden");
    document.getElementById("visualizerEqualizer").classList.add("playing");

    if(isIframe) {
        playerNativo.pause();
        document.getElementById("wrapperAudioNativo").classList.add("hidden");
        document.getElementById("wrapperAudioYoutube").classList.remove("hidden");
        document.getElementById("playerYoutubeIframe").src = urlAudio;
    } else {
        document.getElementById("wrapperAudioYoutube").classList.add("hidden");
        document.getElementById("wrapperAudioNativo").classList.remove("hidden");
        playerNativo.src = urlAudio;
        playerNativo.play().catch(() => {});
    }
    fecharModal("modalMusica");
}

function alternarPlayAudio() {
    let p = document.getElementById("playerAudioNativo");
    if (p.paused) { p.play(); document.getElementById("visualizerEqualizer").classList.add("playing"); } 
    else { p.pause(); document.getElementById("visualizerEqualizer").classList.remove("playing"); }
}

function fecharMiniPlayer() {
    document.getElementById("playerAudioNativo").pause();
    document.getElementById("playerYoutubeIframe").src = "";
    document.getElementById("containerMiniPlayer").classList.add("hidden");
    document.getElementById("visualizerEqualizer").classList.remove("playing");
}

/* JOGO DA VELHA COMPLETO */

let jogoAtActive = true;
let tabuleiroSessao = ["", "", "", "", "", "", "", "", ""];

const linhasVitoria = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
];

function escolherJogadaIA() {
    // IA tenta ganhar
    for (let l of linhasVitoria) {
        let valores = l.map(i => tabuleiroSessao[i]);
        if (valores.filter(v => v === "O").length === 2 && valores.includes("")) {
            return l[valores.indexOf("")];
        }
    }

    // IA bloqueia jogador
    for (let l of linhasVitoria) {
        let valores = l.map(i => tabuleiroSessao[i]);
        if (valores.filter(v => v === "X").length === 2 && valores.includes("")) {
            return l[valores.indexOf("")];
        }
    }

    // Centro
    if (tabuleiroSessao[4] === "") return 4;

    // Cantos
    let cantos = [0,2,6,8].filter(i => tabuleiroSessao[i] === "");
    if (cantos.length) {
        return cantos[Math.floor(Math.random() * cantos.length)];
    }

    // Laterais
    let laterais = [1,3,5,7].filter(i => tabuleiroSessao[i] === "");
    if (laterais.length) {
        return laterais[Math.floor(Math.random() * laterais.length)];
    }

    return null;
}

function jogada(index) {
    if (tabuleiroSessao[index] !== "" || !jogoAtActive) return;

    // Jogador
    tabuleiroSessao[index] = "X";
    document.querySelectorAll(".quadrado")[index].innerText = "X";

    if (checarVitoria("X")) {
        document.getElementById("statusJogo").innerText = "🎉 Vitória!";
        jogoAtActive = false;
        return;
    }

    if (!tabuleiroSessao.includes("")) {
        document.getElementById("statusJogo").innerText = "🤝 Empate!";
        jogoAtActive = false;
        return;
    }

    document.getElementById("statusJogo").innerText = "🤖 IA pensando...";

    // IA joga
    let ia = escolherJogadaIA();

    if (ia !== null) {
        tabuleiroSessao[ia] = "O";
        document.querySelectorAll(".quadrado")[ia].innerText = "O";

        if (checarVitoria("O")) {
            document.getElementById("statusJogo").innerText = "🤖 Fim de jogo para você.";
            jogoAtActive = false;
            return;
        }

        if (!tabuleiroSessao.includes("")) {
            document.getElementById("statusJogo").innerText = "🤝 Empate!";
            jogoAtActive = false;
            return;
        }
    }

    document.getElementById("statusJogo").innerText = "Sua vez! (Você é o X)";
}

function checarVitoria(s) {
    return linhasVitoria.some(c =>
        c.every(i => tabuleiroSessao[i] === s)
    );
}

function resetJogo() {
    tabuleiroSessao.fill("");
    jogoAtActive = true;
    document.querySelectorAll(".quadrado").forEach(q => q.innerText = "");
    document.getElementById("statusJogo").innerText = "Sua vez! (Você é o X)";
}

// LOOP REAL-TIME
setInterval(async () => {
    if (!usuarioLogado) return;
    whatsappAccounts.forEach((w, i) => {
        let el = document.getElementById(`badge-status-\${i}`);
        if (el && w.status === "restrito" && w.restricted_until) {
            el.innerText = "restrito: " + formatRemainingTime(Number(w.restricted_until));
        }
    });
}, 1000);
