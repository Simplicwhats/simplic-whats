function abrirModalScriptNovo(){
    document.getElementById("editScriptId").value = "";
    document.getElementById("nomeScriptModal").value = "";
    document.getElementById("textoScriptModal").value = "";
    abrirModal("modalScript");
}

async function salvarScript(){
    let id = document.getElementById("editScriptId").value;
    let nome = document.getElementById("nomeScriptModal").value;
    let texto = document.getElementById("textoScriptModal").value;

    if(!nome || !texto) return alert("Preencha tudo");

    if(id){
        await supabaseClient.from("message_scripts")
            .update({nome,texto}).eq("id",id);
    } else {
        await supabaseClient.from("message_scripts")
            .insert([{operator_name:usuarioLogado,nome,texto}]);
    }

    fecharModal("modalScript");
    await syncLoadAll();
}

function renderScripts(){
    let html = "";

    listaScripts.forEach(s=>{
        html += `
        <div class="row">
            <div onclick="selectScript(${s.id})">${s.nome}</div>
        </div>`;
    });

    document.getElementById("scriptsContainerList").innerHTML = html;
}

async function selectScript(id){
    await supabaseClient.from("message_scripts")
        .update({selected:false})
        .eq("operator_name",usuarioLogado);

    await supabaseClient.from("message_scripts")
        .update({selected:true})
        .eq("id",id);

    await syncLoadAll();
}
