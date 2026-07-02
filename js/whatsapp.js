function formatRemainingTime(timestamp){
    const diff = timestamp - Date.now();
    if(diff <= 0) return "Liberado";
    const dias = Math.floor(diff / 86400000);
    const horas = Math.floor((diff % 86400000) / 3600000);
    const minutos = Math.floor((diff % 3600000) / 60000);
    const segundos = Math.floor((diff % 60000) / 1000);
    if (dias > 0) return `${dias}d ${horas}h`;
    return `${horas}h ${minutos}m ${segundos}s`;
}

async function addWA(){
    let num = document.getElementById("waNumber").value.trim();
    let role = document.getElementById("waRole").value;
    let browser = document.getElementById("waBrowser").value;
    if(!num) return alert("Digite um número válido");

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
    await syncLoadAll();
}

function renderWA(){
    let html = "";
    whatsappAccounts.forEach((w, i)=>{
        let color = "#10b981";
        let statusText = w.status;
        if(w.status === "restrito"){
            color = "#f59e0b";
            if(w.restricted_until) statusText = "restrito: " + formatRemainingTime(Number(w.restricted_until));
        }
        if(w.status === "banido") color = "#ef4444";

        let roleLabels = { preventive: "Preventivo", acoes: "Ações", reserva: "Reserva" };
        let roleColors = { preventive: "#3b82f6", acoes: "#ef4444", reserva: "#f59e0b" };
        let browserLabels = { chrome: "Google Chrome", edge: "Microsoft Edge" };
        let currentRole = w.role || "preventive";
        let currentBrowser = w.browser || "chrome";

        html += `
        <div class="row" style="align-items: flex-start; padding: 14px 8px;">
            <div>
                <div style="display: flex; align-items: center;">
                    <input type="radio" name="wa" class="radio-custom" onchange="selectWA(${w.id})" ${w.selected ? "checked" : ""}>
                    <span style="cursor:pointer; font-weight:600;" onclick="abrirEditarModal(${i})">${w.number}</span>
                    <span class="small" style="margin-left: 4px;">(${w.sent} envios)</span>
                </div>
                <div style="margin-left: 26px; display: flex; gap: 6px;">
                    <span class="badge-info" style="background: ${roleColors[currentRole]}20; color: ${roleColors[currentRole]}; border: 1px solid ${roleColors[currentRole]}30;">${roleLabels[currentRole]}</span>
                    <span class="badge-info" style="background: #4b556320; color: #e5e7eb; border: 1px solid #4b556340;">💻 ${browserLabels[currentBrowser]}</span>
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
    await syncLoadAll();
}

async function alterarStatusRapido(id, i, statusAlvo) {
    if(statusAlvo === "restrito") {
        abrirEditarModal(i);
        document.getElementById("editModalStatus").value = "restrito";
        toggleTempoRestritoVisibilidade();
    } else {
        await supabaseClient.from('whatsapp_accounts').update({ status: statusAlvo, restricted_until: null }).eq('id', id);
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
    document.getElementById("editModalTempo").value = "";
    toggleTempoRestritoVisibilidade();
    
    document.getElementById("btnSalvarEdicao").onclick = async function() {
        let novoNumero = document.getElementById("editModalNumero").value.trim();
        let novosAcionamentos = parseInt(document.getElementById("editModalSent").value.trim());
        let novoStatus = document.getElementById("editModalStatus").value;
        let novaRole = document.getElementById("editModalRole").value;
        let novoBrowser = document.getElementById("editModalBrowser").value;
        
        if(!novoNumero) return alert("Número inválido!");
        if(isNaN(novosAcionamentos) || novosAcionamentos < 0) return alert("Quantidade inválida!");
        
        let restUntilValue = null;
        if(novoStatus === "restrito") {
            let inputTempo = document.getElementById("editModalTempo").value;
            if(inputTempo) {
                inputTempo = inputTempo.trim().toLowerCase().replace(/\s+/g, '');
                let milissegundosTotais = 0;
                let encontrouFormato = false;
                let matchHoras = inputTempo.match(/(\d+(?:\.\d+)?)h/);
                if(matchHoras) { milissegundosTotais += parseFloat(matchHoras[1]) * 3600000; encontrouFormato = true; }
                let matchMinutos = inputTempo.match(/(\d+(?:\.\d+)?)m/);
                if(matchMinutos) { milissegundosTotais += parseFloat(matchMinutos[1]) * 60000; encontrouFormato = true; }
                if(!encontrouFormato) {
                    let valorPuro = parseFloat(inputTempo);
                    if(!isNaN(valorPuro) && valorPuro > 0) { milissegundosTotais = valorPuro * 3600000; encontrouFormato = true; }
                }
                if(encontrouFormato && milissegundosTotais > 0) {
                    restUntilValue = Date.now() + milissegundosTotais;
                } else {
                    novoStatus = "ativo";
                }
            } else if (conta.restricted_until) {
                restUntilValue = conta.restricted_until;
            } else {
                novoStatus = "ativo";
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
        await syncLoadAll();
    };
    abrirModal("modalEditar");
}

async function removeWA(id){
    if(!confirm("Tem certeza que deseja remover esta conta?")) return;
    await supabaseClient.from('whatsapp_accounts').delete().eq('id', id);
    await syncLoadAll();
}

async function proximo(){
    let wa = whatsappAccounts.find(x => x.selected);
    if(!wa) return alert("Selecione uma conta de WhatsApp de envio.");
    if(wa.status === "banido") return alert("O WhatsApp selecionado está banido!");
    
    if(wa.status === "restrito"){
        if(wa.restricted_until && Date.now() < Number(wa.restricted_until)){
            return alert("WhatsApp restrito.\nTempo restante: " + formatRemainingTime(Number(wa.restricted_until)));
        } else {
            wa.status = "ativo";
            await supabaseClient.from('whatsapp_accounts').update({ status: 'ativo', restricted_until: null }).eq('id', wa.id);
        }
    }

    let proximoContato = contatos.find(c => c.status === "Pendente");
    if(!proximoContato) return alert("Todos os contatos da lista já foram processados!");

    let textoMensagem = proximoContato.script_texto;
    if(!textoMensagem) {
        let scriptGeral = listaScripts.find(x => x.selected);
        if(!scriptGeral) return alert("Nenhum script localizado.");
        textoMensagem = scriptGeral.texto;
    }

    let urlDisparo = "https://web.whatsapp.com/send?phone=" + proximoContato.tel + "&text=" + encodeURIComponent(textoMensagem);
    
    if (!abaWhatsAppReferencia || abaWhatsAppReferencia.closed) {
        abaWhatsAppReferencia = window.open("", "whatsapp_janela_unica_simplic");
    }

    await supabaseClient.from('contacts_queue').update({ status: 'Enviado' }).eq('id', proximoContato.id);
    await supabaseClient.from('whatsapp_accounts').update({ sent: wa.sent + 1 }).eq('id', wa.id);

    abaWhatsAppReferencia.location.href = urlDisparo;
    abaWhatsAppReferencia.focus();

    await syncLoadAll();
}