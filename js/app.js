function abrirModal(id){ document.getElementById(id).classList.remove("hidden"); }
function fecharModal(id){ document.getElementById(id).classList.add("hidden"); }

function toggleTempoRestritoVisibilidade(){
    let status = document.getElementById("editModalStatus").value;
    document.getElementById("containerTempoRestrito")
        .classList.toggle("hidden", status !== "restrito");
}

/* 🔥 LOGIN 100% FIX */
function login() {
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

    syncLoadAll();
window.logout = function(){
    usuarioLogado = "";
    contatos = [];
    whatsappAccounts = [];
    listaScripts = [];

    sessionStorage.clear();

    document.getElementById("login").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
};

window.syncLoadAll = async function(){
    if(!usuarioLogado) return;

    let wa = await supabaseClient.from("whatsapp_accounts")
        .select("*")
        .eq("operator_name", usuarioLogado);

    whatsappAccounts = wa.data || [];

    let sc = await supabaseClient.from("message_scripts")
        .select("*")
        .eq("operator_name", usuarioLogado);

    listaScripts = sc.data || [];

    let ct = await supabaseClient.from("contacts_queue")
        .select("*")
        .eq("operator_name", usuarioLogado);

    contatos = ct.data || [];

    renderWA();
    renderScripts();
    renderContatos();
};
