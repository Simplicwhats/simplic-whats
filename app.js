// ATENÇÃO: Nunca exponha chaves no Front-end em produção! 
const SUPABASE_URL = "https://kgidkxaqvgcqiqwqxvut.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnaWRreGFxdmdjcWlxd3F4dnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODc0MzAsImV4cCI6MjA5ODA2MzQzMH0.DLQoO8_q_QeW-a084ZDCFRc0OIeuEDaYpkUg2tSCB0E";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// VARIÁVEIS GLOBAIS
let contatos = [], whatsappAccounts = [], listaScripts = [];
let usuarioLogado = "", carteiraLogada = "", filtroStatusAtual = 'todos';
let filaPausada = false, timerRegressivo = null, contaEditandoIndex = null;

// ==========================================
// UTILITÁRIOS GERAIS
// ==========================================
function escapeHTML(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>'"]/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[match]));
}

function showToast(msg, tipo = 'success') {
    const c = document.getElementById("toast-container");
    const t = document.createElement("div");
    t.className = "toast";
    let bColors = { success: 'var(--theme-primary)', error: 'var(--red)', info: 'var(--blue)', warning: 'var(--orange)' };
    t.style.borderLeftColor = bColors[tipo] || bColors.success;
    let icon = tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : tipo === 'warning' ? '⚠️' : 'ℹ️';
    t.textContent = `${icon} ${msg}`;
    c.appendChild(t);
    setTimeout(() => { t.style.animation = "fadeIn 0.3s ease reverse"; setTimeout(() => t.remove(), 300); }, 3500);
}

function abrirModal(id) { document.getElementById(id).classList.remove("hidden"); }
function fecharModal(id) { document.getElementById(id).classList.add("hidden"); }
function limparEValidarTelefone(tel) { let l = tel.replace(/\D/g, ""); return l.length === 11 && l.startsWith("9") ? "55" + l : l.length === 11 && !l.startsWith("55") ? "55" + l : l.length === 9 ? "5511" + l : l; }

// ==========================================
// LOGIN & THEMAS MULTIEMPRESA
// ==========================================
async function login() {
    let u = document.getElementById("user").value.trim();
    let p = document.getElementById("pass").value.trim();
    let c = document.getElementById("selectCarteira").value;
    if(!u || !p) return showToast("Preencha os dados!", "warning");

    try {
        const { data: user, error } = await supabaseClient.from('users').select('*').eq('username', u).eq('password', p).single();
        if (error || !user) return showToast("Usuário ou senha inválidos!", "error");
        if (user.role !== 'admin' && user.carteira !== c) return showToast("Usuário não pertence a esta carteira!", "error");

        usuarioLogado = user.username;
        carteiraLogada = user.carteira || c;
        
        // 🎒 SALVANDO NA MOCHILA:
        localStorage.setItem('carteiraAtiva', carteiraLogada);
        localStorage.setItem('nomeOperador', usuarioLogado);
        
        document.body.setAttribute('data-company', carteiraLogada);
        if (carteiraLogada === "Simplic") {
    document.getElementById("lblEmpresa").textContent = "Simplic";
    document.getElementById("logoEmpresa").src = "./logo-simplic.png"; // <-- Coloque o link da logo aqui
    document.getElementById("logoEmpresa").style.display = "block";
} else {
    document.getElementById("lblEmpresa").textContent = "Loft";
    document.getElementById("logoEmpresa").src = "./logo-loft.png"; // <-- Coloque o link da logo aqui
    document.getElementById("logoEmpresa").style.display = "block";
}
        document.getElementById("lblUsuario").textContent = usuarioLogado;
        
        document.getElementById("login").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");

        if (user.role === 'admin') {
            document.getElementById("painelAdm").classList.remove("hidden");
            carregarStatsAdm();
        }
        await syncLoadAll();
    } catch(e) { showToast("Erro no servidor.", "error"); }
}

function logout() { location.reload(); }
function toggleTheme() { let curr = document.body.getAttribute('data-theme'); document.body.setAttribute('data-theme', curr === 'dark' ? 'light' : 'dark'); }

async function cadastrarOperador() {
    let u = document.getElementById("newOpUser").value, p = document.getElementById("newOpPass").value, c = document.getElementById("newOpCarteira").value;
    if(!u || !p) return showToast("Preencha usuário e senha", "error");
    await supabaseClient.from('users').insert([{ username: u, password: p, carteira: c, role: 'operador' }]);
    showToast("Operador criado!", "success"); carregarStatsAdm();
}

async function carregarStatsAdm() {
    const { data: users } = await supabaseClient.from('users').select('*');
    const { data: history } = await supabaseClient.from('history').select('*');
    if(!users || !history) return;

    let htmlUsers = "", htmlCharts = "", rank = [];
    users.filter(u => u.role === 'operador').forEach(op => {
        let enviosOp = history.filter(h => h.operador === op.username).length;
        rank.push({ nome: op.username, vol: enviosOp });
        htmlUsers += `<div class="adm-stat-card"><strong>${escapeHTML(op.username)}</strong><span class="small block mb-5">${escapeHTML(op.carteira)}</span><span class="text-theme fw-600">Envios: ${enviosOp}</span></div>`;
    });
    document.getElementById("admStats").innerHTML = htmlUsers;

    rank.sort((a,b) => b.vol - a.vol).slice(0,3).forEach((r, i) => {
        let medal = i===0?'🥇':i===1?'🥈':'🥉';
        document.getElementById("rankingOperadores").innerHTML += `<div class="row p-5"><span class="fw-600">${medal} ${escapeHTML(r.nome)}</span><strong class="text-theme">${r.vol}</strong></div>`;
    });
    
    // Instâncias Fake Chart (Backend real agruparia history.instancia_utilizada)
    document.getElementById("graficoInstancias").innerHTML = `
        <div class="chart-row"><span class="w-100px text-muted">Instância 1</span><div class="bar bg-theme" style="width: 80%;"></div><span class="fw-600">80</span></div>
        <div class="chart-row"><span class="w-100px text-muted">Instância 2</span><div class="bar" style="background:var(--blue); width: 45%;"></div><span class="fw-600">45</span></div>
    `;
}

function exportarDados(tipo) { showToast(`Exportando relatório em ${tipo.toUpperCase()}...`, "info"); }

// ==========================================
// CORE DATA SYNC
// ==========================================
async function syncLoadAll() {
    if(!usuarioLogado) return;
    try {
        // Busca as Instâncias do Operador na respectiva Carteira
        let resWa = await supabaseClient.from('whatsapp_accounts')
            .select('*')
            .eq('carteira', carteiraLogada)
            .eq('operator_name', usuarioLogado)
            .order('id', { ascending: true });
        whatsappAccounts = resWa.data || [];

        // Busca os Scripts do Operador na respectiva Carteira
        let resScr = await supabaseClient.from('scripts')
            .select('*')
            .eq('carteira', carteiraLogada)
            .eq('operator_name', usuarioLogado)
            .order('id', { ascending: true });
        listaScripts = resScr.data || [];

        // Busca a Fila de Contatos do Operador na respectiva Carteira
        let resCon = await supabaseClient.from('contacts_queue')
            .select('*')
            .eq('carteira', carteiraLogada)
            .eq('operator_name', usuarioLogado)
            .order('id', { ascending: true });
        contatos = resCon.data || [];
        
        renderKPIs(); 
        renderWA(); 
        renderScripts(); 
        filtrarEBuscarFila();
    } catch(e) { 
        console.error("Erro no syncLoadAll:", e); 
    }
}

function renderKPIs() {
    document.getElementById("kpiTotalFila").textContent = contatos.filter(c => c.status === "Pendente").length;
    document.getElementById("kpiEnviados").textContent = contatos.filter(c => c.status === "Enviado" && c.operator_name === usuarioLogado).length;
    document.getElementById("kpiAtivos").textContent = whatsappAccounts.filter(w => w.status === "ativo").length;
    document.getElementById("kpiRestritos").textContent = whatsappAccounts.filter(w => w.status === "restrito" || w.status === "banido").length;
}

// ==========================================
// INSTÂNCIAS E AUTOMAÇÃO (45/50)
// ==========================================
async function addWA() {
    // Aqui você já deve ter as variáveis pegando os valores da tela, algo como:
    let numero = document.getElementById("waNumber").value.trim();
    let funcao = document.getElementById("waRole").value;

    if (!numero) return showToast("Digite o número!", "warning");

    // 👉 1. Puxamos a carteira e o operador da mochila:
    let carteiraSegura = localStorage.getItem('carteiraAtiva');
    let operadorSeguro = localStorage.getItem('nomeOperador');

    // 👉 2. Adicionamos os dois no pacote de envio para o banco:
    const { data, error } = await supabaseClient.from('whatsapp_accounts').insert([{ 
        number: numero, 
        role: funcao, 
        status: 'ativo', 
        carteira: carteiraSegura,       // Agora vai preenchido certo!
        operator_name: operadorSeguro   // Aqui está a chave que o banco pedia!
    }]);

    if (error) {
        console.error("Erro ao salvar número:", error);
        return showToast("Erro ao conectar instância.", "error");
    }

    document.getElementById("waNumber").value = ""; showToast("Instância conectada!"); syncLoadAll();
}

function renderWA() {
    let html = "";
    whatsappAccounts.forEach((w, i) => {
        let color = w.status === "restrito" ? "var(--orange)" : w.status === "banido" ? "var(--red)" : "var(--green)";
        let alert = w.sent >= 40 ? `<span class="badge-status bg-red text-white ml-10">⚠️ ${w.sent}/50</span>` : '';
        html += `
        <div class="row radius-8 bg-light-overlay">
            <div class="flex-row align-center gap-10">
                <input type="radio" name="wa" onchange="selectWA('${w.id}')" ${w.selected ? "checked" : ""}>
                <span class="fw-600 cursor-pointer" onclick="abrirEditarModal(${i})">${escapeHTML(w.number)}</span>
                <span class="small text-muted">(${w.sent} envios)</span> ${alert}
                <span class="badge-status ml-10" style="border:1px solid var(--blue); color:var(--blue);">${w.role}</span>
            </div>
            <div class="flex-row gap-5 align-center">
                <span class="badge-status text-white" style="background:${color}">${w.status}</span>
                <button onclick="abrirEditarModal(${i})" class="btn-icon text-blue">📝</button>
                <button onclick="removeWA('${w.id}')" class="btn-icon text-red">✕</button>
            </div>
        </div>`;
    });
    document.getElementById("waList").innerHTML = html;
}

async function selectWA(id) {
    await supabaseClient.from('whatsapp_accounts').update({ selected: false }).eq('carteira', carteiraLogada);
    await supabaseClient.from('whatsapp_accounts').update({ selected: true }).eq('id', id); syncLoadAll();
}
async function removeWA(id) { if(confirm("Remover?")) { await supabaseClient.from('whatsapp_accounts').delete().eq('id', id); syncLoadAll(); } }

function abrirEditarModal(i) {
    contaEditandoIndex = i; let w = whatsappAccounts[i];
    document.getElementById("editModalNumero").value = w.number;
    document.getElementById("editModalSent").value = w.sent;
    document.getElementById("editModalRole").value = w.role;
    document.getElementById("editModalStatus").value = w.status;
    document.getElementById("btnSalvarEdicao").onclick = async function() {
        let st = document.getElementById("editModalStatus").value, restUntil = null;
        if(st === "restrito") restUntil = new Date(Date.now() + (parseFloat(document.getElementById("editModalTempo").value||0) * (document.getElementById("editModalUnidade").value==='dias'?86400000:3600000))).toISOString();
        await supabaseClient.from('whatsapp_accounts').update({ number: limparEValidarTelefone(document.getElementById("editModalNumero").value), sent: parseInt(document.getElementById("editModalSent").value), role: document.getElementById("editModalRole").value, status: st, restricted_until: restUntil }).eq('id', w.id);
        fecharModal('modalEditar'); syncLoadAll(); showToast("Salvo.");
    }; abrirModal('modalEditar');
}

function toggleTempoRestritoVisibilidade() {
    // Verifique se os IDs abaixo batem com os do seu HTML do modal de edição
    let selectStatus = document.getElementById("editWaStatus"); // ID do campo de Status
    let divTempo = document.getElementById("divTempoRestrito"); // ID da div que envolve o campo de tempo

    if (selectStatus && divTempo) {
        if (selectStatus.value === "restrito") {
            divTempo.style.display = "block"; // Mostra o campo
        } else {
            divTempo.style.display = "none";  // Esconde o campo
        }
    }
}
// ==========================================
// FILA INTELIGENTE E DISPARO
// ==========================================
function mudarFiltroLista(st) { filtroStatusAtual = st; document.querySelectorAll(".tabs-container .tab, .grid .tab").forEach(e=>e.classList.remove("active")); event.target.classList.add("active"); filtrarEBuscarFila(); }
function filtrarEBuscarFila() {
    let t = document.getElementById("buscaContatoInput").value.trim().toLowerCase();
    let f = contatos.filter(c => {
        if(filtroStatusAtual !== 'todos' && c.status !== filtroStatusAtual) return false;
        if(!t) return true;
        return (c.tel&&c.tel.toLowerCase().includes(t)) || (c.nome&&c.nome.toLowerCase().includes(t)) || (c.script_nome&&c.script_nome.toLowerCase().includes(t));
    });
    document.getElementById("lista").innerHTML = f.map(c => `
        <div class="row radius-8 bg-light-overlay">
            <div>
                <strong class="text-main">${escapeHTML(c.tel)}</strong> <span class="small text-muted ml-10">${escapeHTML(c.nome||'')} - ${escapeHTML(c.empresa||'')}</span>
                <div class="small mt-5 text-theme">📝 ${escapeHTML(c.script_nome||'')}</div>
            </div>
            <div class="flex-row align-center gap-10">
                <span class="badge-status text-white ${c.status==='Enviado'?'bg-theme':'gray'}">${c.status}</span>
                <button onclick="removerContatoFila('${c.id}')" class="btn-icon text-red">✕</button>
            </div>
        </div>
    `).join("") || '<div class="text-center p-15 text-muted small">Nenhum resultado.</div>';
}
async function removerContatoFila(id) { await supabaseClient.from('contacts_queue').delete().eq('id', id); syncLoadAll(); }
async function limparContatos() { if(confirm("Limpar toda a fila?")) { await supabaseClient.from('contacts_queue').delete().eq('carteira', carteiraLogada); syncLoadAll(); } }

function abrirModalContatos() {
    let sel = document.getElementById("modalSelectScriptDefinido"); sel.innerHTML = "";
    listaScripts.forEach((s, i) => sel.innerHTML += `<option value="${i}">${escapeHTML(s.nome)}</option>`);
    abrirModal("modalContatos");
}
async function salvarContatos() {
    let sIdx = document.getElementById("modalSelectScriptDefinido").value, raw = document.getElementById("telefonesInputModal").value;
    let linhas = raw.split("\n").map(x=>x.trim()).filter(x=>x), unicos = new Set(), dups = 0, pkgs = [];
    linhas.forEach(l => {
        let p = l.split(";"), num = limparEValidarTelefone(p[0]); if(!num) return;
        if(unicos.has(num)) { dups++; return; } unicos.add(num);
        pkgs.push({ carteira: carteiraLogada, operator_name: usuarioLogado, tel: num, nome: p[1]||"", empresa: p[2]||carteiraLogada, status: "Pendente", script_nome: listaScripts[sIdx]?.nome||"Padrão" });
    });
    document.getElementById("importStats").innerHTML = `Lidos: ${linhas.length} | Salvos: ${pkgs.length} | <span class="text-orange">Duplicados Excluídos: ${dups}</span>`;
    document.getElementById("importStats").classList.remove("hidden");
    if(pkgs.length > 0) { await supabaseClient.from('contacts_queue').insert(pkgs); setTimeout(()=>{fecharModal("modalContatos"); syncLoadAll(); document.getElementById("telefonesInputModal").value="";}, 1500); }
}

function iniciarContagemEnvio() { filaPausada = false; document.getElementById("btnProximoChamado").classList.add("hidden"); document.getElementById("btnPausarFila").classList.remove("hidden"); executarLoopEnvio(); }
function pausarFila() { filaPausada = true; clearInterval(timerRegressivo); document.getElementById("btnPausarFila").classList.add("hidden"); document.getElementById("btnProximoChamado").classList.remove("hidden"); document.getElementById("timerContainerBanner").classList.add("hidden"); }

async function executarLoopEnvio() {
    if(filaPausada) return;
    let wa = whatsappAccounts.find(x => x.selected && x.status === "ativo"), contato = contatos.find(c => c.status === "Pendente");
    if(!contato) { showToast("Fila finalizada!", "info"); return pausarFila(); }
    if(!wa) { showToast("Sem instância ativa!", "error"); return pausarFila(); }
    
    document.getElementById("timerContainerBanner").classList.remove("hidden");
    let seg = 3; document.getElementById("lblRegressivoSegundo").textContent = seg;
    timerRegressivo = setInterval(async () => {
        seg--; document.getElementById("lblRegressivoSegundo").textContent = seg;
        if(seg <= 0) { clearInterval(timerRegressivo); await processarEnvio(wa, contato); }
    }, 1000);
}

async function processarEnvio(wa, contato) {
    let script = listaScripts.find(s => s.nome === contato.script_nome);
    let textoStr = script ? script.conteudo : "Olá!";
    textoStr = textoStr.replace(/\{nome\}/gi, contato.nome||"").replace(/\{empresa\}/gi, contato.empresa||carteiraLogada);
    
    await supabaseClient.from('contacts_queue').update({ status: 'Enviado' }).eq('id', contato.id);
    await supabaseClient.from('history').insert([{ telefone: contato.tel, nome_cliente: contato.nome, operador: usuarioLogado, empresa: carteiraLogada, script_utilizado: contato.script_nome, instancia_utilizada: wa.number }]);
    
    let novosEnvios = wa.sent + 1, attWA = { sent: novosEnvios };
    if(novosEnvios >= 50) {
        attWA.status = "restrito"; attWA.restricted_until = new Date(Date.now() + 86400000).toISOString(); attWA.selected = false;
        showToast(`Instância ${wa.number} RESTRITA (50 envios).`, "warning");
        let prox = whatsappAccounts.find(x => x.id !== wa.id && x.status === 'ativo' && x.role === 'preventive');
        if(prox) await supabaseClient.from('whatsapp_accounts').update({ selected: true }).eq('id', prox.id);
    } else if (novosEnvios >= 45 && wa.role === 'preventive') {
        attWA.role = "reserva"; attWA.selected = false;
        showToast(`Instância rotacionada para reserva.`, "info");
        let prox = whatsappAccounts.find(x => x.id !== wa.id && x.status === 'ativo');
        if(prox) await supabaseClient.from('whatsapp_accounts').update({ selected: true }).eq('id', prox.id);
    }
    await supabaseClient.from('whatsapp_accounts').update(attWA).eq('id', wa.id);
    
    window.open(`https://web.whatsapp.com/send/?phone=${contato.tel}&text=${encodeURIComponent(textoStr)}`, "_blank");
    await syncLoadAll(); if(!filaPausada) setTimeout(executarLoopEnvio, 2000);
}

// ==========================================
// SCRIPTS & IA
// ==========================================
function abrirModalScriptNovo() { document.getElementById("tituloScriptModal").textContent = "Criar Script"; document.getElementById("editScriptId").value = ""; document.getElementById("nomeScriptModal").value = ""; document.getElementById("textoScriptModal").value = ""; abrirModal("modalScript"); }
async function salvarScript() {
    let id = document.getElementById("editScriptId").value, 
        n = document.getElementById("nomeScriptModal").value.trim(), 
        c = document.getElementById("categoriaScriptModal").value, 
        txt = document.getElementById("textoScriptModal").value.trim();
        
    if(!n || !txt) return showToast("Preencha tudo.", "warning");

    // Puxa a carteira e o operador da nossa mochila
    let carteiraSegura = localStorage.getItem('carteiraAtiva');
    let operadorSeguro = localStorage.getItem('nomeOperador'); // Puxando o nome!

    if(id) {
        await supabaseClient.from('scripts').update({ nome: n, categoria: c, conteudo: txt }).eq('id', id);
    } else {
        // 👉 AQUI A MÁGICA ACONTECE: Adicionamos o 'operator_name: operadorSeguro' no envio
        await supabaseClient.from('scripts').insert([{ 
            carteira: carteiraSegura, 
            operator_name: operadorSeguro, // Essa coluna agora vai preenchida!
            nome: n, 
            categoria: c, 
            conteudo: txt, 
            favorito: listaScripts.length===0 
        }]);
    }
    
    fecharModal("modalScript"); 
    showToast("Script salvo!"); 
    syncLoadAll();
}
function renderScripts() {
    let catFiltro = document.getElementById("filtroCategoriaScript").value;
    let filtrados = listaScripts.filter(s => catFiltro === "todos" || s.categoria === catFiltro);
    document.getElementById("scriptsContainerList").innerHTML = filtrados.map(s => `
        <div class="row radius-8 bg-light-overlay py-5">
            <span class="fw-600 cursor-pointer ${s.favorito?'text-theme':''}" onclick="selectScript('${s.id}')">${s.favorito?'⭐ ':''}${escapeHTML(s.nome)} <span class="small text-muted">(${s.categoria})</span></span>
            <div class="flex-row gap-5">
                <button onclick="prepararEdicaoScript('${s.id}', '${escapeHTML(s.nome)}', '${escapeHTML(s.categoria)}', '${btoa(unescape(encodeURIComponent(s.conteudo)))}')" class="btn-icon text-blue">📝</button>
                <button onclick="removerScript('${s.id}')" class="btn-icon text-red">✕</button>
            </div>
        </div>
    `).join("");
    let ativo = listaScripts.find(x => x.favorito);
    document.getElementById("preview").textContent = ativo ? ativo.conteudo : "Selecione um script";
}
async function selectScript(id) { await supabaseClient.from('scripts').update({ favorito: false }).eq('carteira', carteiraLogada); await supabaseClient.from('scripts').update({ favorito: true }).eq('id', id); syncLoadAll(); }
async function removerScript(id) { if(confirm("Deletar script?")) { await supabaseClient.from('scripts').delete().eq('id', id); syncLoadAll(); } }
function prepararEdicaoScript(id, n, c, b64) { document.getElementById("tituloScriptModal").textContent = "Editar Script"; document.getElementById("editScriptId").value = id; document.getElementById("nomeScriptModal").value = n; document.getElementById("categoriaScriptModal").value = c; document.getElementById("textoScriptModal").value = decodeURIComponent(escape(atob(b64))); abrirModal("modalScript"); }
function editarScriptAtivo() { let a = listaScripts.find(x=>x.favorito); if(a) prepararEdicaoScript(a.id, a.nome, a.categoria, btoa(unescape(encodeURIComponent(a.conteudo)))); }
async function gerarScriptComIA() {
    let p = document.getElementById("promptIA").value;
    if (!p) return showToast("Digite as instruções para a IA.", "warning");

    showToast("🤖 Conectando com a IA... Aguarde.", "info");
    const btn = event.target;
    btn.disabled = true;
    btn.innerText = "Gerando...";

    try {
        // COLOQUE AQUI A URL DO SEU PROJETO E A CHAVE ANON (as mesmas que ficam no topo do app.js)
        const supabaseUrl = "https://kgidkxaqvgcqiqwqxvut.supabase.co"; 
        const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnaWRreGFxdmdjcWlxd3F4dnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODc0MzAsImV4cCI6MjA5ODA2MzQzMH0.DLQoO8_q_QeW-a084ZDCFRc0OIeuEDaYpkUg2tSCB0E";

        // Fazemos a chamada "na força bruta", contornando o bloqueio interno do Supabase
        const response = await fetch(`${supabaseUrl}/functions/v1/hyper-handler`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`
            },
            body: JSON.stringify({ prompt: p })
        });

        if (!response.ok) {
            throw new Error(`Erro do servidor: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) throw new Error(data.error);

        document.getElementById("textoScriptModal").value = data.texto;
        abrirModal("modalScript");
        fecharModal("modalIA");
        showToast("✨ Script gerado com sucesso!", "success");

    } catch (err) {
        console.error("Erro na IA:", err);
        showToast("Erro ao comunicar com a IA. Tente novamente.", "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "✨ Gerar Script";
    }
}
// ==========================================
// PLAYER DE MÚSICA & JOGO (CÓDIGO ORIGINAL)
// ==========================================
function mudarAbaMusica(aba) { document.getElementById("tabBtnBusca").classList.toggle("active", aba==='busca'); document.getElementById("tabBtnLink").classList.toggle("active", aba==='link'); document.getElementById("abaMusicaBusca").classList.toggle("hidden", aba!=='busca'); document.getElementById("abaMusicaLink").classList.toggle("hidden", aba!=='link'); }
async function buscarMusicaPorNome() { let t = document.getElementById("inputBuscaNome").value; if(!t) return; let res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(t)}&entity=song&limit=4`); let json = await res.json(); document.getElementById("containerResultadosBusca").innerHTML = json.results.map(f => `<div class="row"><div class="small fw-600">${escapeHTML(f.trackName)}<br><span class="text-muted">${escapeHTML(f.artistName)}</span></div><button class="btn-theme small m-0" onclick="ejecutarAudioSessao('${f.previewUrl}', '${escapeHTML(f.trackName)}', false)">▶</button></div>`).join(""); }
function carregarLofiPadrao() { ejecutarAudioSessao("https://stream.zeno.fm/0r0xa792kwzuv", "Rádio Lofi Chill", false); }
function carregarMusicaUrl() { let url = document.getElementById("inputLinkMusica").value; if(!url) return; let match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/); if(match && match[2].length===11) ejecutarAudioSessao(`https://www.youtube.com/embed/${match[2]}?autoplay=1&enablejsapi=1`, "YouTube", true); else ejecutarAudioSessao(url, "Mídia Externa", false); }
function ejecutarAudioSessao(url, nome, isIframe) {
    document.getElementById("lblNomeMusicaTocando").textContent = nome; document.getElementById("containerMiniPlayer").classList.remove("hidden"); document.getElementById("visualizerEqualizer").classList.add("playing");
    let pn = document.getElementById("playerAudioNativo"), yt = document.getElementById("playerYoutubeIframe");
    if(isIframe) { pn.pause(); pn.src=""; document.getElementById("wrapperAudioNativo").classList.add("hidden"); document.getElementById("wrapperAudioYoutube").classList.remove("hidden"); yt.src = url; }
    else { yt.src=""; document.getElementById("wrapperAudioYoutube").classList.add("hidden"); document.getElementById("wrapperAudioNativo").classList.remove("hidden"); pn.src = url; pn.play().catch(()=>{}); }
    fecharModal("modalMusica");
}
function alternarPlayAudio() {
    let eq = document.getElementById("visualizerEqualizer");
    let yt = document.getElementById("playerYoutubeIframe");
    let pn = document.getElementById("playerAudioNativo");

    // Lógica para quando for vídeo do YouTube
    if (!document.getElementById("wrapperAudioYoutube").classList.contains("hidden")) {
        if (eq.classList.contains("playing")) {
            // Pausa a animação
            eq.classList.remove("playing");
            // Envia comando de PAUSE interno para o YouTube sem apagar o vídeo
            yt.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        } else {
            // Retoma a animação
            eq.classList.add("playing");
            // Envia comando de PLAY interno para o YouTube de onde parou
            yt.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        }
        return;
    }

    // Lógica para quando for MP3 ou Rádio Lofi (Áudio Nativo)
    if (pn.src && pn.src !== "") {
        if (pn.paused) { 
            pn.play(); 
            eq.classList.add("playing"); 
        } else { 
            pn.pause(); 
            eq.classList.remove("playing"); 
        }
    }
}
function fecharMiniPlayer() { document.getElementById("playerAudioNativo").pause(); document.getElementById("playerYoutubeIframe").src=""; document.getElementById("containerMiniPlayer").classList.add("hidden"); document.getElementById("visualizerEqualizer").classList.remove("playing"); }

let jogoAtivo = true, tabSessao = ["","","","","","","","",""]; const vitoria = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function escolherJogadaIA() { for(let l of vitoria){let val=l.map(i=>tabSessao[i]); if(val.filter(v=>v==="O").length===2&&val.includes("")) return l[val.indexOf("")];} for(let l of vitoria){let val=l.map(i=>tabSessao[i]); if(val.filter(v=>v==="X").length===2&&val.includes("")) return l[val.indexOf("")];} if(tabSessao[4]==="") return 4; let cantos=[0,2,6,8].filter(i=>tabSessao[i]===""); if(cantos.length) return cantos[Math.floor(Math.random()*cantos.length)]; let lat=[1,3,5,7].filter(i=>tabSessao[i]===""); if(lat.length) return lat[Math.floor(Math.random()*lat.length)]; return null; }
function jogada(idx) { if(tabSessao[idx]!=="" || !jogoAtivo) return; tabSessao[idx]="X"; document.querySelectorAll(".quadrado")[idx].textContent="X"; if(vitoria.some(c=>c.every(i=>tabSessao[i]==="X"))){ document.getElementById("statusJogo").textContent="🎉 Você Venceu!"; jogoAtivo=false; return; } if(!tabSessao.includes("")){ document.getElementById("statusJogo").textContent="🤝 Empate!"; jogoAtivo=false; return; } document.getElementById("statusJogo").textContent="🤖 IA pensando..."; setTimeout(()=>{ let ia = escolherJogadaIA(); if(ia!==null && jogoAtivo){ tabSessao[ia]="O"; document.querySelectorAll(".quadrado")[ia].textContent="O"; if(vitoria.some(c=>c.every(i=>tabSessao[i]==="O"))){ document.getElementById("statusJogo").textContent="🤖 IA Venceu!"; jogoAtivo=false; return; } if(!tabSessao.includes("")){ document.getElementById("statusJogo").textContent="🤝 Empate!"; jogoAtivo=false; return; } } if(jogoAtivo) document.getElementById("statusJogo").textContent="Sua vez! (X)"; }, 500); }
function resetJogo() { tabSessao.fill(""); jogoAtivo=true; document.querySelectorAll(".quadrado").forEach(q=>q.textContent=""); document.getElementById("statusJogo").textContent="Sua vez! (X)"; }

// VERIFICAÇÃO CONTÍNUA DE STATUS
setInterval(async () => {
    if(!usuarioLogado) return;
    let needsSync = false;
    whatsappAccounts.forEach(w => {
        if(w.status === "restrito" && w.restricted_until) {
            if(new Date(w.restricted_until) <= new Date()) {
                supabaseClient.from('whatsapp_accounts').update({ status: 'ativo', restricted_until: null, sent: 0 }).eq('id', w.id).then(()=>{ needsSync = true; });
            }
        }
    });
    if(needsSync) syncLoadAll();
}, 60000); // Check a cada 1 min
