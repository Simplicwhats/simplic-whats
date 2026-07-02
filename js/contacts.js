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

async function salvarContatos(){
    let scriptIdx = document.getElementById("modalSelectScriptDefinido").value;
    if(scriptIdx === "") return alert("Você precisa selecionar um script válido.");
    
    let scriptVinculado = listaScripts[scriptIdx];
    let rawInput = document.getElementById("telefonesInputModal").value;
    let listagemNovos = rawInput.split("\n").map(x => x.trim()).filter(x => x);

    if(listagemNovos.length === 0) return alert("Insira pelo menos um número.");

    let packageData = listagemNovos.map(linha => {
        let partes = linha.split(";");
        let numero = partes[0].trim();
        let nomeCliente = partes[1] ? partes[1].trim() : "";
        let textoCustomizado = scriptVinculado.texto;

        if(nomeCliente) {
            textoCustomizado = textoCustomizado.replace(/\{nome\}/gi, nomeCliente);
        } else {
            textoCustomizado = textoCustomizado.replace(/\{nome\}/gi, "");
            textoCustomizado = textoCustomizado.replace(/Olá\s+/gi, "Olá, ");
            textoCustomizado = textoCustomizado.replace(/\s{2,}/g, " ");
        }

        return {
            operator_name: usuarioLogado,
            tel: numero,
            status: "Pendente",
            script_texto: textoCustomizado, 
            script_nome: scriptVinculado.nome
        };
    });

    await supabaseClient.from('contacts_queue').insert(packageData);
    document.getElementById("telefonesInputModal").value = "";
    fecharModal("modalContatos");
    await syncLoadAll();
}

async function limparContatos(){
    if(!confirm("Remover todos os clientes da fila?")) return;
    await supabaseClient.from('contacts_queue').delete().eq('operator_name', usuarioLogado);
    await syncLoadAll();
}

async function removerContatoFila(id){
    await supabaseClient.from('contacts_queue').delete().eq('id', id);
    await syncLoadAll();
}

function renderContatos(){
    let html = "";
    let pendentes = contatos.filter(c => c.status === "Pendente");
    
    if (pendentes.length === 0) {
        html = `<div class="small" style="text-align:center; padding:30px; color:var(--text-muted);">Nenhum número na fila de pendentes.</div>`;
        document.getElementById("lista").innerHTML = html;
        return;
    }

    pendentes.forEach((c) => {
        html += `
        <div class="row" style="padding: 10px 6px;">
            <div>
                <span style="font-weight:600; color:#fff;">${c.tel}</span>
                <div class="small" style="color: var(--blue); font-size:11px; margin-top:2px;">📋 Script: ${c.script_nome || 'Padrão'}</div>
            </div>
            <div class="action-buttons">
                <span style="color: #9ca3af; font-weight: 600; font-size: 11px; text-transform: uppercase;">${c.status}</span>
                <button onclick="removerContatoFila(${c.id})" class="btn-icon" style="color:#ef4444;">✕</button>
            </div>
        </div>`;
    });
    document.getElementById("lista").innerHTML = html;
}