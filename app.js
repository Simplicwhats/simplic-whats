const SUPABASE_URL = "https://kgidkxaqvgcqiqwqxvut.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnaWRreGFxdmdjcWlxd3F4dnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODc0MzAsImV4cCI6MjA5ODA2MzQzMH0.DLQoO8_q_QeW-a084ZDCFRc0OIeuEDaYpkUg2tSCB0E";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let contatos = [];
let whatsappAccounts = [];
let listaScripts = [];
let contaEditandoIndex = null;
let usuarioLogado = "";
let carteiraLogada = ""; // NOVO
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

// NOVO LOGIN UNIFICADO COM SISTEMA DE CARTEIRAS
// Substitua sua função login atual por esta:
async function login(){
    let u = document.getElementById("user").value.trim();
    let p = document.getElementById("pass").value.trim();
    let c = document.getElementById("selectCarteira").value;

    // Buscamos o usuário primeiro
    const { data: user, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('username', u)
        .eq('password', p)
        .single();

    if (!user) return showToast("Usuário ou senha inválidos!", "error");

    // Se for admin, ele entra sem validar a carteira, ou você pode validar se quiser
    // Se for operador comum, validamos a carteira
    if (user.role !== 'admin' && user.carteira !== c) {
        return showToast("Usuário não pertence a esta carteira!", "error");
    }

    usuarioLogado = user.username;
    carteiraLogada = user.carteira;
    
    document.getElementById("lblUsuario").innerText = usuarioLogado;
    document.getElementById("login").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    if (user.role === 'admin') {
        document.getElementById("painelAdm").classList.remove("hidden");
        // O Admin vê tudo por padrão
        carregarStatsAdm('todos');
        
        // Esconde jogo e música para o Admin
        document.getElementById("linkJogo").style.display = "none";
        document.getElementById("sepJogo").style.display = "none";
        document.getElementById("linkMusica").style.display = "none";
        document.getElementById("sepMusica").style.display = "none";
    } else {
        document.getElementById("painelAdm").classList.add("hidden");
    }
    
    await syncLoadAll();
}

function logout() {
    location.reload(); // Atualiza a página inteira para limpar tudo e evitar erros no player
}

async function cadastrarOperador() {
    let u = document.getElementById("newOpUser").value;
    let p = document.getElementById("newOpPass").value;
    let c = document.getElementById("newOpCarteira").value;
    
    if(!u || !p) return showToast("Preencha usuário e senha", "error");

    await supabaseClient.from('users').insert([{ username: u, password: p, carteira: c, role: 'operador' }]);
    showToast("Operador criado com sucesso!", "success");
    
    document.getElementById("newOpUser").value = "";
    document.getElementById("newOpPass").value = "";
    carregarStatsAdm('todos');
}

// ESTATÍSTICAS COM FILTRO DE CARTEIRAS E CONTAGEM DE ACIONAMENTOS
async function carregarStatsAdm(filtro) {
    const { data: users } = await supabaseClient.from('users').select('*');
    const { data: contacts } = await supabaseClient.from('contacts_queue').select('operator_name, status');
    
    let container = document.getElementById("admStats");
    if (!container || !users) return;

    let html = "";
    let operadoresFiltrados = users.filter(u => filtro === 'todos' || u.carteira === filtro);
    
    operadoresFiltrados.forEach(op => {
        let acionadosDia = contacts ? contacts.filter(c => c.operator_name === op.username && c.status === 'Enviado').length : 0;
        let naFila = contacts ? contacts.filter(c => c.operator_name === op.username && c.status === 'Pendente').length : 0;
        
        html += `
            <div class="adm-stat-card">
                <strong>${op.username}</strong>
                <span style="color:#a0aec0; margin-bottom: 5px;">Carteira: ${op.carteira || 'Indefinida'}</span>
                <span>Fila: ${naFila}</span>
                <span style="color:var(--blue); font-weight:bold; margin-top:4px;">Acionados: ${acionadosDia}</span>
            </div>
        `;
    });
    container.innerHTML = html;
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

        // ADICIONE O AWAIT AQUI NESSA LINHA:
        await renderKPIs(); 
        
        renderWA();
        renderScripts();
        filtrarEBuscarFila();

        // Atualiza stats de admin em tempo real
        let painel = document.getElementById("painelAdm");
        if (painel && !painel.classList.contains("hidden")) {
            carregarStatsAdm('todos');
        }
    } catch (error) {
        console.error("Erro na sincronização:", error);
    }
}

async function renderKPIs() {
    // 1. Filtro do dia de hoje (meia-noite de hoje até o final do dia)
    const hojeInicio = new Date();
    hojeInicio.setHours(0, 0, 0, 0);
    const hojeFim = new Date();
    hojeFim.setHours(23, 59, 59, 999);

    // 2. Busca assíncrona no Supabase para contar quantos foram enviados HOJE pelo operador ativo
    let totalEnviadosHoje = 0;
    try {
        const { count } = await supabaseClient
            .from('contacts_queue')
            .select('*', { count: 'exact', head: true })
            .eq('operator_name', usuarioLogado)
            .eq('status', 'Enviado')
            .gte('updated_at', hojeInicio.toISOString())
            .lte('updated_at', hojeFim.toISOString());
            
        totalEnviadosHoje = count || 0;
    } catch (err) {
        console.error("Erro ao buscar acionamentos de hoje:", err);
        // Fallback rápido caso a consulta falhe (filtra localmente pelo que está na fila carregada)
        totalEnviadosHoje = contatos.filter(c => c.status === "Enviado").length;
    }

    // 3. Atualiza os elementos na tela
    const kpiIds = ["kpiTotalFila", "kpiEnviados", "kpiAtivos", "kpiRestritos"];
    kpiIds.forEach(id => {
        let el = document.getElementById(id);
        if (el) {
            if (id === "kpiTotalFila") el.innerText = contatos.length;
            if (id === "kpiEnviados") el.innerText = totalEnviadosHoje;
            if (id === "kpiAtivos") el.innerText = whatsappAccounts.filter(w => w.status === "ativo").length;
            if (id === "kpiRestritos") el.innerText = whatsappAccounts.filter(w => w.status === "restrito" || w.status === "banido").length;
        }
    });
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
        
        if (novoStatus === "restrito") {
            let inputTempo = document.getElementById("editModalTempo").value;
            let unidade = document.getElementById("editModalUnidade").value; 
            
            if (inputTempo > 0) {
                let multiplicador = unidade === 'dias' ? 86400000 : 3600000;
                restUntilValue = Date.now() + (parseFloat(inputTempo) * multiplicador);
            }
        }

        // Atualização no Supabase
        const { error } = await supabaseClient
            .from('whatsapp_accounts')
            .update({ 
                number: novoNumero,
                sent: novosAcionamentos,
                status: novoStatus,
                role: novaRole,
                browser: novoBrowser,
                restricted_until: restUntilValue
            })
            .eq('id', conta.id);

        if (error) {
            console.error("Erro ao salvar:", error);
            alert("Erro ao salvar: " + error.message);
        } else {
            fecharModal("modalEditar");
            showToast("Alterações salvas com sucesso!");
            await syncLoadAll(); // Garante que a lista na tela seja atualizada
        }
    };
    
    abrirModal("modalEditar");
}
async function removeWA(id) {
    if (!confirm("Remover esta conta?")) return;
    await supabaseClient.from('whatsapp_accounts').delete().eq('id', id);
    showToast("Instância desconectada.", "warning");
    await syncLoadAll();
}

/* ==========================================
   FILTRAGEM E BUSCA DE CONTATOS NA FILA (LAYOUT ORIGINAL)
   ========================================== */
function mudarFiltroLista(statusAlvo) {
    filtroStatusAtual = statusAlvo;
    const abas = {
        'todos': 'filterTabAll',
        'Pendente': 'filterTabPendente',
        'Enviado': 'filterTabEnviado',
        'Erro': 'filterTabErro'
    };
    
    Object.values(abas).forEach(abaId => {
        const el = document.getElementById(abaId);
        if (el) el.classList.remove('active');
    });
    
    const abaAtiva = document.getElementById(abas[statusAlvo]);
    if (abaAtiva) abaAtiva.classList.add('active');

    filtrarEBuscarFila();
}

function filtrarEBuscarFila() {
    let buscaInput = document.getElementById("buscaContatoInput");
    if (!buscaInput) return; 

    let termoBusca = buscaInput.value.trim().toLowerCase();
    let listaFiltrada = contatos;

    if (filtroStatusAtual !== 'todos') {
        listaFiltrada = listaFiltrada.filter(c => c.status === filtroStatusAtual);
    }

    if (termoBusca) {
        listaFiltrada = listaFiltrada.filter(c => 
            c.tel.toLowerCase().includes(termoBusca)
        );
    }
    renderContatos(listaFiltrada);
}

// RETORNADO AO PAINEL ORIGINAL DE ACIONAMENTO
function renderContatos(dadosFila) {
    let html = "";
    const containerLista = document.getElementById("lista");
    if (!containerLista) return;

    if (dadosFila.length === 0) {
        html = `<div class="small" style="text-align:center; padding:30px; color:var(--text-muted);">Nenhum número correspondente encontrado.</div>`;
        containerLista.innerHTML = html;
        return;
    }

    dadosFila.forEach((c) => {
        let badgeColor = c.status === 'Enviado' ? 'var(--blue)' : c.status === 'Erro' ? 'var(--red)' : 'var(--text-muted)';
        
        html += `
        <div class="row" style="padding: 12px 8px;">
            <div>
                <span style="font-weight:600; color:#fff;">${c.tel}</span>
                <span class="badge-status" style="margin-left:10px; background-color:${badgeColor}; color:#fff; font-size:10px; padding:2px 6px; border-radius:4px;">
                    ${c.status}
                </span>
            </div>
            <div class="action-buttons">
                <button onclick="removerContatoFila(${c.id})" class="btn-icon" style="color:#ef4444; font-weight:bold; font-size:16px;">✕</button>
            </div>
        </div>`;
    });
    containerLista.innerHTML = html;
}

/* ==========================================
   AÇÕES DIRETAS NA FILA DE CONTATOS
   ========================================== */
async function salvarContatos() {
    let scriptIdx = document.getElementById("modalSelectScriptDefinido").value;
    if (scriptIdx === "") return showToast("Selecione um script válido.", "warning");
    
    let scriptVinculado = listaScripts[scriptIdx];
    let rawInput = document.getElementById("telefonesInputModal").value;
    let listagemNovos = rawInput.split("\n").map(x => x.trim()).filter(x => x);

    if (listagemNovos.length === 0) return showToast("Insira ao menos um telefone.", "warning");

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
            script_nome: scriptVinculado.nome,
            created_at: new Date().toISOString() // Marcador de data para KPIs corretos
        };
    });

    await supabaseClient.from('contacts_queue').insert(packageData);
    
    document.getElementById("telefonesInputModal").value = "";
    fecharModal("modalContatos");
    showToast(`${packageData.length} Contatos adicionados.`);
    await syncLoadAll();
}

async function limparContatos() {
    if (!confirm("Remover permanentemente toda a fila?")) return;
    await supabaseClient.from('contacts_queue').delete().eq('operator_name', usuarioLogado);
    showToast("Fila esvaziada.", "info");
    await syncLoadAll();
}

async function removerContatoFila(id) {
    await supabaseClient.from('contacts_queue').delete().eq('id', id);
    showToast("Contato excluído da lista.");
    await syncLoadAll();
}

/* ==========================================
   GERENCIAMENTO DE SCRIPTS DE MENSAGENS
   ========================================== */
function abrirModalScriptNovo() {
    document.getElementById("tituloScriptModal").innerText = "Criar Novo Script";
    document.getElementById("editScriptId").value = ""; 
    document.getElementById("nomeScriptModal").value = "";
    document.getElementById("textoScriptModal").value = "";
    abrirModal("modalScript");
}

async function salvarScript() {
    let idExistente = document.getElementById("editScriptId").value;
    let nome = document.getElementById("nomeScriptModal").value.trim();
    let texto = document.getElementById("textoScriptModal").value.trim();
    
    if (!nome || !texto) return showToast("Preencha o nome e o texto do script.", "warning");

    if (idExistente) {
        await supabaseClient.from('message_scripts').update({ nome: nome, texto: texto }).eq('id', idExistente);
    } else {
        await supabaseClient.from('message_scripts').insert([{ 
            operator_name: usuarioLogado, 
            nome: nome, 
            texto: texto, 
            selected: listaScripts.length === 0 
        }]);
    }
    fecharModal("modalScript");
    showToast("Script atualizado com sucesso.");
    await syncLoadAll();
}

function renderScripts() {
    let html = "";
    listaScripts.forEach((s) => {
        let base64 = btoa(unescape(encodeURIComponent(s.texto)));
        html += `
        <div class="row" style="padding: 8px 6px;">
            <div style="display: flex; align-items: center; flex: 1; justify-content: space-between;">
                <span style="font-weight: 600; cursor: pointer; color: ${s.selected ? 'var(--blue)' : '#fff'};" onclick="selectScript(${s.id})">
                    ${s.selected ? '🔹 ' : ''}${s.nome}
                </span>
                <div class="action-buttons">
                    <button onclick="prepararEdicaoScript(${s.id}, '${s.nome}', '${base64}')" class="btn-icon" style="color:#3b82f6;">📝</button>
                    <button onclick="removerScript(${s.id})" class="btn-icon" style="color:#ef4444;">✕</button>
                </div>
            </div>
        </div>`;
    });
    
    let containerScripts = document.getElementById("scriptsContainerList");
    if (containerScripts) containerScripts.innerHTML = html;

    let containerPreview = document.getElementById("preview");
    if (containerPreview) {
        let ativo = listaScripts.find(x => x.selected);
        containerPreview.innerText = ativo ? ativo.texto : "Nenhum script ativo selecionado.";
    }
}

// EDITAR SCRIPT SELECIONADO DIRETAMENTE DO PREVIEW
function editarScriptAtivo() {
    let ativo = listaScripts.find(x => x.selected);
    if (!ativo) return showToast("Nenhum script ativo para editar.", "warning");
    let base64 = btoa(unescape(encodeURIComponent(ativo.texto)));
    prepararEdicaoScript(ativo.id, ativo.nome, base64);
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
    showToast("Script ativo alterado.");
    await syncLoadAll();
}

async function removerScript(id) {
    if (!confirm("Deletar este script?")) return;
    await supabaseClient.from('message_scripts').delete().eq('id', id);
    showToast("Script removido.", "warning");
    await syncLoadAll();
}

/* ==========================================
   CÁLCULO E FORMATAÇÃO DE RESTRIÇÕES (DIA/HORA)
   ========================================== */
function formatRemainingTime(timestampFuturo) {
    let agora = Date.now();
    let diferenca = timestampFuturo - agora;
    
    if (diferenca <= 0) return "";

    let totalSegundos = Math.floor(diferenca / 1000);
    let totalMinutos = Math.floor(totalSegundos / 60);
    let totalHoras = Math.floor(totalMinutos / 60);
    let dias = Math.floor(totalHoras / 24);

    let horasRestantes = totalHoras % 24;
    let minutosRestantes = totalMinutos % 60;

    if (dias > 0) {
        return `${dias}d ${horasRestantes.toString().padStart(2, '0')}h`;
    } else if (totalHoras > 0) {
        return `${totalHoras.toString().padStart(2, '0')}h ${minutosRestantes.toString().padStart(2, '0')}m`;
    } else {
        let segundosRestantes = totalSegundos % 60;
        return `${minutosRestantes.toString().padStart(2, '0')}m ${segundosRestantes.toString().padStart(2, '0')}s`;
    }
}

/* ==========================================
   TIMER REGRESSIVO & DISPARO SEGURO
   ========================================== */
function iniciarContagemEnvio() {
    let wa = whatsappAccounts.find(x => x.selected);
    if (!wa || wa.status === "banido") return showToast("Verifique sua instância ativa antes de enviar.", "error");

    let proximoContato = contatos.find(c => c.status === "Pendente");
    if (!proximoContato) return showToast("Nenhum contato pendente na fila.", "warning");

    cancelarEnvioRegressivo();
    segundosRestantesRegressivo = 3;
    
    const banner = document.getElementById("timerContainerBanner");
    const labelSegundos = document.getElementById("lblRegressivoSegundo");
    const btnProximo = document.getElementById("btnProximoChamado");

    if (labelSegundos) labelSegundos.innerText = segundosRestantesRegressivo;
    if (banner) banner.classList.remove("hidden");
    if (btnProximo) btnProximo.disabled = true;

    regressiveTimerPointer = setInterval(async () => {
        segundosRestantesRegressivo--;
        if (labelSegundos) labelSegundos.innerText = segundosRestantesRegressivo;

        if (segundosRestantesRegressivo <= 0) {
            clearInterval(regressiveTimerPointer);
            if (banner) banner.classList.add("hidden");
            if (btnProximo) btnProximo.disabled = false;
            await dispararProximoWhatsappEfetivo(wa, proximoContato);
        }
    }, 1000);
}

function cancelarEnvioRegressivo() {
    if (regressiveTimerPointer) clearInterval(regressiveTimerPointer);
    const banner = document.getElementById("timerContainerBanner");
    const btnProximo = document.getElementById("btnProximoChamado");
    
    if (banner) banner.classList.add("hidden");
    if (btnProximo) btnProximo.disabled = false;
}

async function dispararProximoWhatsappEfetivo(wa, contatoAlvo) {
    // Atualiza o contato para Enviado e guarda o timestamp do envio
    await supabaseClient.from('contacts_queue').update({ 
        status: 'Enviado',
        updated_at: new Date().toISOString()
    }).eq('id', contatoAlvo.id);
    
    await supabaseClient.from('whatsapp_accounts').update({ sent: wa.sent + 1 }).eq('id', wa.id);

    let urlDisparo = "https://web.whatsapp.com/send/?phone=" + contatoAlvo.tel + "&text=" + encodeURIComponent(contatoAlvo.script_texto);
    
    window.open(urlDisparo, "_blank");
    
    showToast("Enviado e atualizado com sucesso!");
    await syncLoadAll();
}

/* ==========================================
   MUSIC PLAYER AUDIOFLOW (SUPORTE INTEGRAL AO YOUTUBE)
   ========================================== */
function mudarAbaMusica(aba) {
    const tabBusca = document.getElementById("tabBtnBusca");
    const tabLink = document.getElementById("tabBtnLink");
    const abaBusca = document.getElementById("abaMusicaBusca");
    const abaLink = document.getElementById("abaMusicaLink");

    if (tabBusca) tabBusca.classList.toggle("active", aba === 'busca');
    if (tabLink) tabLink.classList.toggle("active", aba === 'link');
    if (abaBusca) abaBusca.classList.toggle("hidden", aba !== 'busca');
    if (abaLink) abaLink.classList.toggle("hidden", aba !== 'link');
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
                <div><strong>${faixa.trackName}</strong><br><span class="small" style="color: var(--text-muted);">${faixa.artistName}</span></div>
                <button class="green" onclick="ejecutarAudioSessao('${faixa.previewUrl}', '${faixa.trackName.replace(/'/g, "\\'")}', false)" style="margin:0; padding:4px 10px;">▶</button>
            </div>`;
        });
        document.getElementById("containerResultadosBusca").innerHTML = htmlResultados;
    } catch (e) { 
        showToast("Falha ao buscar música.", "error"); 
    }
}

function carregarLofiPadrao() { 
    ejecutarAudioSessao("https://stream.zeno.fm/0r0xa792kwzuv", "Rádio Lofi Chill", false); 
}

function carregarMusicaUrl() {
    let url = document.getElementById("inputLinkMusica").value.trim();
    if (!url) return;
    
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        let match = url.match(regExp);
        if (match && match[2].length === 11) {
            let id = match[2];
            // Configuração para embutir autoplay no player
            ejecutarAudioSessao(`https://www.youtube.com/embed/${id}?autoplay=1&enablejsapi=1`, "YouTube Vídeo", true);
        } else {
            showToast("URL do YouTube inválida.", "warning");
        }
    } else {
        ejecutarAudioSessao(url, "Mídia Externa", false);
    }
}

function ejecutarAudioSessao(urlAudio, nome, isIframe) {
    let playerNativo = document.getElementById("playerAudioNativo");
    const labelNome = document.getElementById("lblNomeMusicaTocando");
    const miniPlayer = document.getElementById("containerMiniPlayer");
    const equalizer = document.getElementById("visualizerEqualizer");

    if (labelNome) labelNome.innerText = nome;
    if (miniPlayer) miniPlayer.classList.remove("hidden");
    if (equalizer) equalizer.classList.add("playing");

    if (isIframe) {
        if (playerNativo) {
            playerNativo.pause();
            playerNativo.src = "";
        }
        document.getElementById("wrapperAudioNativo").classList.add("hidden");
        document.getElementById("wrapperAudioYoutube").classList.remove("hidden");
        document.getElementById("playerYoutubeIframe").src = urlAudio;
    } else {
        // Pausar o Iframe do YouTube limpando a sua URL
        document.getElementById("playerYoutubeIframe").src = "";
        document.getElementById("wrapperAudioYoutube").classList.add("hidden");
        document.getElementById("wrapperAudioNativo").classList.remove("hidden");
        if (playerNativo) {
            playerNativo.src = urlAudio;
            playerNativo.play().catch(() => {});
        }
    }
    fecharModal("modalMusica");
}

function alternarPlayAudio() {
    let p = document.getElementById("playerAudioNativo");
    const equalizer = document.getElementById("visualizerEqualizer");
    const ytIframe = document.getElementById("playerYoutubeIframe");
    
    // Se estiver tocando YouTube, alternar limpando/restabelecendo o link
    if (ytIframe && ytIframe.src !== "" && !document.getElementById("wrapperAudioYoutube").classList.contains("hidden")) {
        if (equalizer.classList.contains("playing")) {
            equalizer.classList.remove("playing");
            // Salva a URL atual e limpa para simular pause no iframe
            ytIframe.dataset.savedSrc = ytIframe.src;
            ytIframe.src = "";
        } else {
            equalizer.classList.add("playing");
            ytIframe.src = ytIframe.dataset.savedSrc || "";
        }
        return;
    }

    if (!p) return;
    if (p.paused) { 
        p.play().catch(() => {}); 
        if (equalizer) equalizer.classList.add("playing"); 
    } else { 
        p.pause(); 
        if (equalizer) equalizer.classList.remove("playing"); 
    }
}

function fecharMiniPlayer() {
    const player = document.getElementById("playerAudioNativo");
    const iframe = document.getElementById("playerYoutubeIframe");
    const container = document.getElementById("containerMiniPlayer");
    const equalizer = document.getElementById("visualizerEqualizer");

    if (player) {
        player.pause();
        player.src = "";
    }
    if (iframe) iframe.src = "";
    if (container) container.classList.add("hidden");
    if (equalizer) equalizer.classList.remove("playing");
}

/* ==========================================
   MINI-GAME: JOGO DA VELHA CONTRA I.A.
   ========================================== */
let jogoAtActive = true;
let tabuleiroSessao = ["", "", "", "", "", "", "", "", ""];

const linhasVitoria = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
];

function escolherJogadaIA() {
    for (let l of linhasVitoria) {
        let valores = l.map(i => tabuleiroSessao[i]);
        if (valores.filter(v => v === "O").length === 2 && valores.includes("")) {
            return l[valores.indexOf("")];
        }
    }
    for (let l of linhasVitoria) {
        let valores = l.map(i => tabuleiroSessao[i]);
        if (valores.filter(v => v === "X").length === 2 && valores.includes("")) {
            return l[valores.indexOf("")];
        }
    }
    if (tabuleiroSessao[4] === "") return 4;
    let cantos = [0,2,6,8].filter(i => tabuleiroSessao[i] === "");
    if (cantos.length) return cantos[Math.floor(Math.random() * cantos.length)];
    let laterais = [1,3,5,7].filter(i => tabuleiroSessao[i] === "");
    if (laterais.length) return laterais[Math.floor(Math.random() * laterais.length)];
    return null;
}

function jogada(index) {
    if (tabuleiroSessao[index] !== "" || !jogoAtActive) return;

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

    setTimeout(() => {
        let ia = escolherJogadaIA();

        if (ia !== null && jogoAtActive) {
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
        if (jogoAtActive) {
            document.getElementById("statusJogo").innerText = "Sua vez! (Você é o X)";
        }
    }, 450);
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

/* ==========================================
   LOOP DE ATUALIZAÇÃO EM TEMPO REAL (Timers)
   ========================================== */
setInterval(async () => {
    if (!usuarioLogado) return;
    whatsappAccounts.forEach((w, i) => {
        let el = document.getElementById(`badge-status-${i}`);
        if (el && w.status === "restrito" && w.restricted_until) {
            let tempoFormatado = formatRemainingTime(Number(w.restricted_until));
            if (tempoFormatado) {
                el.innerText = "restrito: " + tempoFormatado;
            } else {
                // Se a restrição acabou, removemos o status de restrito no banco de dados automaticamente
                el.innerText = "ativo";
                supabaseClient.from('whatsapp_accounts').update({ status: 'ativo', restricted_until: null }).eq('id', w.id);
            }
        }
    });
}, 1000);
