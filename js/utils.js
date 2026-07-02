function abrirModal(id) {
    document.getElementById(id).classList.remove("hidden");
}

function fecharModal(id) {
    document.getElementById(id).classList.add("hidden");
}

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
