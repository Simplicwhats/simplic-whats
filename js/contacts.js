window.abrirModalContatos = function() {
    let select = document.getElementById("modalSelectScriptDefinido");
    select.innerHTML = "";

    if(listaScripts.length === 0){
        select.innerHTML = "<option>Crie um script</option>";
    } else {
        listaScripts.forEach((s,i)=>{
            select.innerHTML += `<option value="${i}">${s.nome}</option>`;
        });
    }

    abrirModal("modalContatos");
}

window.salvarContatos = async function(){
    let idx = document.getElementById("modalSelectScriptDefinido").value;
    if(idx === "") return alert("Selecione script");

    let script = listaScripts[idx];
    let raw = document.getElementById("telefonesInputModal").value;

    let linhas = raw.split("\n").map(x=>x.trim()).filter(Boolean);

    let data = linhas.map(l=>{
        let [tel,nome] = l.split(";");

        let texto = script.texto;
        if(nome) texto = texto.replace(/\{nome\}/gi,nome);

        return {
            operator_name: usuarioLogado,
            tel,
            status: "Pendente",
            script_texto: texto,
            script_nome: script.nome
        };
    });

    await supabaseClient.from("contacts_queue").insert(data);

    fecharModal("modalContatos");
    await syncLoadAll();
};

window.renderContatos = function(){
    let pendentes = contatos.filter(c=>c.status==="Pendente");

    let html = "";

    if(pendentes.length === 0){
        document.getElementById("lista").innerHTML = "Nenhum contato";
        return;
    }

    pendentes.forEach(c=>{
        html += `
        <div class="row">
            <div>${c.tel}</div>
            <button onclick="removerContatoFila(${c.id})">✕</button>
        </div>`;
    });

    document.getElementById("lista").innerHTML = html;
};

window.removerContatoFila = async function(id){
    await supabaseClient.from("contacts_queue")
        .delete().eq("id",id);

    await syncLoadAll();
};
