function abrirModal(id){ document.getElementById(id).classList.remove("hidden"); }
function fecharModal(id){ document.getElementById(id).classList.add("hidden"); }

function toggleTempoRestritoVisibilidade(){
    let status = document.getElementById("editModalStatus").value;
    document.getElementById("containerTempoRestrito")
        .classList.toggle("hidden", status !== "restrito");
}

/* 🔥 LOGIN CORRIGIDO */
window.login = async function(){
    let user = document.getElementById("user").value.trim();
    let pass = document.getElementById("pass").value.trim();

    if(user === "Levi" && pass === "2104"){
        usuarioLogado = "Levi";
    } else if(user === "Mariana" && pass === "123mudar"){
        usuarioLogado = "Mariana";
    } else {
        return alert("Login inválido");
    }

    sessionStorage.setItem("_ss_op", btoa(usuarioLogado));

    document.getElementById("lblUsuario").innerText = usuarioLogado;
    document.getElementById("login").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    await syncLoadAll();
};

window.logout = function(){
    usuarioLogado = "";
    whatsappAccounts = [];
    contatos = [];
    listaScripts = [];
    sessionStorage.clear();

    document.getElementById("app").classList.add("hidden");
    document.getElementById("login").classList.remove("hidden");
};

async function syncLoadAll(){
    if(!usuarioLogado) return;

    let wa = await supabaseClient.from('whatsapp_accounts')
        .select('*').eq('operator_name', usuarioLogado);

    whatsappAccounts = wa.data || [];

    let sc = await supabaseClient.from('message_scripts')
        .select('*').eq('operator_name', usuarioLogado);

    listaScripts = sc.data || [];

    let ct = await supabaseClient.from('contacts_queue')
        .select('*').eq('operator_name', usuarioLogado);

    contatos = ct.data || [];

    renderWA();
    renderScripts();
    renderContatos();
}
