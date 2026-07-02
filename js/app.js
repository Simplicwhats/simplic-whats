function abrirModal(id) { document.getElementById(id).classList.remove("hidden"); }
function fecharModal(id) { document.getElementById(id).classList.add("hidden"); }

function toggleTempoRestritoVisibilidade() {
    let status = document.getElementById("editModalStatus").value;
    document.getElementById("containerTempoRestrito").classList.toggle("hidden", status !== "restrito");
}

async function login(){
    let userDigitado = document.getElementById("user").value.trim();
    let passDigitado = document.getElementById("pass").value.trim();

    if (userDigitado === "Levi" && passDigitado === "2104") {
        usuarioLogado = "Levi";
    } else if (userDigitado === "Mariana" && passDigitado === "123mudar") {
        usuarioLogado = "Mariana";
    } else {
        return alert("Login ou senha inválidos");
    }

    sessionStorage.setItem("_ss_op", btoa(usuarioLogado));

    document.getElementById("lblUsuario").innerText = usuarioLogado;
    document.getElementById("login").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    
    document.getElementById("user").value = "";
    document.getElementById("pass").value = "";

    await syncLoadAll();
}

function logout() {
    usuarioLogado = "";
    whatsappAccounts = [];
    contatos = [];
    listaScripts = [];
    abaWhatsAppReferencia = null;
    sessionStorage.clear();
    fecharMiniPlayer();
    document.getElementById("app").classList.add("hidden");
    document.getElementById("login").classList.remove("hidden");
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

        renderWA();
        renderScripts();
        renderContatos();
    } catch (error) {
        console.error("Erro na sincronização:", error);
    }
}

// LOOP TIMER GLOBAL (Roda a cada 1 segundo)
let processandoLoop = false;
setInterval(async () => {
    if (!usuarioLogado || processandoLoop) return; 
    processandoLoop = true;
    try {
        let alterouSessao = false;
        for (let w of whatsappAccounts) {
            if (w.status === "restrito" && w.restricted_until && Date.now() >= Number(w.restricted_until)) {
                await supabaseClient.from('whatsapp_accounts').update({ status: 'ativo', restricted_until: null }).eq('id', w.id);
                alterouSessao = true;
            }
        }
        if (alterouSessao) { await syncLoadAll(); } 
        else {
            whatsappAccounts.forEach((w, i) => {
                let elementoBadge = document.getElementById(`badge-status-${i}`);
                if (elementoBadge && w.status === "restrito" && w.restricted_until) {
                    elementoBadge.innerText = "restrito: " + formatRemainingTime(Number(w.restricted_until));
                }
            });
        }
    } catch(err) { console.error(err); } 
    finally { processandoLoop = false; }
}, 1000);