let jogoAtActive = true;
let jogadorAtual = "X"; 
let tabuleiroSessao = ["", "", "", "", "", "", "", "", ""];
const vitoriasDisponiveis = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];

function jogada(index) {
    if (tabuleiroSessao[index] !== "" || !jogoAtActive || jogadorAtual !== "X") return;
    ejecutarMovimento(index, "X");
    if (jogoAtActive) {
        document.getElementById("statusJogo").innerText = "🤖 IA pensando...";
        setTimeout(jogadaIA, 400);
    }
}

function ejecutarMovimento(index, simbolo) {
    tabuleiroSessao[index] = simbolo;
    let quadrados = document.querySelectorAll(".quadrado");
    quadrados[index].innerText = simbolo;
    quadrados[index].style.color = simbolo === "X" ? "var(--blue)" : "var(--red)";
    
    if (checarVitoria(simbolo)) {
        document.getElementById("statusJogo").innerText = simbolo === "X" ? "🎉 Você venceu!" : "🤖 A IA venceu!";
        jogoAtActive = false; return;
    }
    if (!tabuleiroSessao.includes("")) {
        document.getElementById("statusJogo").innerText = "🤝 Empate!";
        jogoAtActive = false; return;
    }
    jogadorAtual = simbolo === "X" ? "O" : "X";
}

function jogadaIA() {
    if (!jogoAtActive) return;
    for (let simbi of ["O", "X"]) {
        for (let combo of vitoriasDisponiveis) {
            let preenchidos = combo.map(i => tabuleiroSessao[i]);
            if (preenchidos.filter(s => s === simbi).length === 2 && preenchidos.includes("")) {
                let r = combo[preenchidos.indexOf("")];
                ejecutarMovimento(r, "O");
                if (jogoAtActive) document.getElementById("statusJogo").innerText = "Sua vez! (Você é o X)";
                return;
            }
        }
    }
    let vazios = tabuleiroSessao.map((val, idx) => val === "" ? idx : null).filter(val => val !== null);
    ejecutarMovimento(vazios[Math.floor(Math.random() * vazios.length)], "O");
    if (jogoAtActive) document.getElementById("statusJogo").innerText = "Sua vez! (Você é o X)";
}

function checarVitoria(simbolo) { return vitoriasDisponiveis.some(combo => combo.every(i => tabuleiroSessao[i] === simbolo)); }
function resetJogo() {
    tabuleiroSessao = ["", "", "", "", "", "", "", "", ""];
    jogoAtActive = true; jogadorAtual = "X";
    document.getElementById("statusJogo").innerText = "Sua vez! (Você é o X)";
    document.querySelectorAll(".quadrado").forEach(q => q.innerText = "");
}