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
    
    if(!nome || !texto) return alert("Preencha todos os campos do script");

    if (idExistente) {
        await supabaseClient.from('message_scripts').update({ nome: nome, texto: texto }).eq('id', idExistente);
    } else {
        let isFirst = listaScripts.length === 0;
        await supabaseClient.from('message_scripts').insert([{
            operator_name: usuarioLogado,
            nome: nome,
            texto: texto,
            selected: isFirst
        }]);
    }
    
    fecharModal("modalScript");
    await syncLoadAll();
}

function renderScripts() {
    let html = "";
    if (listaScripts.length === 0) {
        html = `<div class="small" style="text-align:center; padding:10px; color:var(--text-muted);">Nenhum script criado.</div>`;
        document.getElementById("scriptsContainerList").innerHTML = html;
        document.getElementById("preview").innerText = "";
        return;
    }

    listaScripts.forEach((s) => {
        let textoEscapadoBase64 = btoa(unescape(encodeURIComponent(s.texto)));
        let nomeSanitizado = s.nome.replace(/'/g, "\\'").replace(/"/g, '\\"');
        
        html += `
        <div class="row" style="padding: 8px 6px;">
            <div style="display: flex; align-items: center; flex: 1; cursor: pointer;" onclick="selectScript(${s.id})">
                <input type="radio" name="scriptSelect" class="radio-custom" ${s.selected ? "checked" : ""}>
                <span style="font-weight: 600; color: ${s.selected ? 'var(--blue)' : 'var(--text-main)'};">${s.nome}</span>
            </div>
            <div class="action-buttons">
                <button onclick="prepararEdicaoScript(${s.id}, '${nomeSanitizado}', '${textoEscapadoBase64}')" class="btn-icon" style="color:#3b82f6;">📝</button>
                <button onclick="removerScript(${s.id})" class="btn-icon" style="color:#ef4444;">✕</button>
            </div>
        </div>`;
    });

    document.getElementById("scriptsContainerList").innerHTML = html;
    previewScript();
}

function prepararEdicaoScript(id, nome, base64Texto) {
    document.getElementById("tituloScriptModal").innerText = "Editar Script";
    document.getElementById("editScriptId").value = id; 
    document.getElementById("nomeScriptModal").value = nome;
    document.getElementById("textoScriptModal").value = decodeURIComponent(escape(atob(base64Texto)));
    abrirModal("modalScript");
}

async function selectScript(id) {
    await supabaseClient.from('message_scripts').update({ selected: false }).eq('operator_name', usuarioLogado);
    await supabaseClient.from('message_scripts').update({ selected: true }).eq('id', id);
    await syncLoadAll();
}

async function removerScript(id){
    if(!confirm("Deseja deletar este script?")) return;
    await supabaseClient.from('message_scripts').delete().eq('id', id);
    await syncLoadAll();
}

function previewScript(){
    let scriptAtivo = listaScripts.find(x => x.selected);
    document.getElementById("preview").innerText = scriptAtivo ? scriptAtivo.texto : "Nenhum script selecionado.";
}