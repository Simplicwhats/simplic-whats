function mudarAbaMusica(aba) {
    document.getElementById("tabBtnBusca").classList.toggle("active", aba === 'busca');
    document.getElementById("tabBtnLink").classList.toggle("active", aba === 'link');
    document.getElementById("abaMusicaBusca").classList.toggle("hidden", aba !== 'busca');
    document.getElementById("abaMusicaLink").classList.toggle("hidden", aba !== 'link');
}

async function buscarMusicaPorNome() {
    let termo = document.getElementById("inputBuscaNome").value.trim();
    if (!termo) return alert("Digite o nome de uma música ou artista!");

    let container = document.getElementById("containerResultadosBusca");
    container.innerHTML = `<div class="small" style="text-align:center; padding:10px; color: var(--primary);">🔍 Buscando...</div>`;

    try {
        let resposta = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(termo)}&entity=song&limit=5`);
        let dados = await resposta.json();

        if (!dados.results || dados.results.length === 0) {
            container.innerHTML = `<div class="small" style="text-align:center; padding:10px; color: var(--red);">Nenhuma música encontrada.</div>`;
            return;
        }

        let htmlResultados = "";
        dados.results.forEach(faixa => {
            let identificadorLabel = `${faixa.trackName} - ${faixa.artistName}`.replace(/'/g, "\\'");
            htmlResultados += `
            <div class="busca-item-resultado">
                <div style="max-width: 70%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    <strong style="color:var(--text-main); font-size:12px;">${faixa.trackName}</strong><br>
                    <span class="small">${faixa.artistName}</span>
                </div>
                <button class="green" onclick="executarAudioSessao('${faixa.previewUrl}', '${identificadorLabel}', false)" style="margin:0; padding:4px 10px; font-size:11px;">▶ Ouvir</button>
            </div>`;
        });
        container.innerHTML = htmlResultados;
    } catch (e) {
        container.innerHTML = `<div class="small" style="text-align:center; padding:10px; color: var(--red);">Erro no serviço de busca.</div>`;
    }
}

async function carregarMusicaUrl() {
    let inputUrl = document.getElementById("inputLinkMusica").value.trim();
    if (!inputUrl) return alert("Por favor, digite a URL.");
    
    if (inputUrl.includes("link.deezer.com")) {
        try {
            let resposta = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(inputUrl)}`);
            let dados = await resposta.json();
            
            let matchUrlReal = dados.contents.match(/https:\/\/www\.deezer\.com\/[^\s"\']+/);
            if (matchUrlReal) {
                inputUrl = matchUrlReal[0];
            } else {
                let matchIdDireto = dados.contents.match(/(?:playlist|album|track)\/(\d+)/);
                if (matchIdDireto) {
                    let urlEmbedDeezer = `https://widget.deezer.com/widget/dark/${matchIdDireto[0]}?tracklist=true`;
                    executarAudioSessao(urlEmbedDeezer, "Playlist Deezer", true);
                    return;
                }
            }
        } catch (err) {
            console.error("Erro ao expandir link curto:", err);
            alert("Links encurtados do celular (link.deezer.com) precisam ser abertos no navegador antes. Copie o link completo.");
            return;
        }
    }
    
    let regExpYoutube = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let matchYoutube = inputUrl.match(regExpYoutube);
    
    if (matchYoutube && matchYoutube[2].length === 11) {
        let videoId = matchYoutube[2];
        executarAudioSessao(`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`, "Vídeo do YouTube", true);
        return; 
    } 
    
    let regExpDeezer = /deezer\.com\/(?:\w{2}\/)?(playlist|album|track)\/(\d+)/;
    let matchDeezer = inputUrl.match(regExpDeezer);
    
    if (matchDeezer) {
        let tipo = matchDeezer[1]; 
        let id = matchDeezer[2];
        let urlEmbedDeezer = `https://widget.deezer.com/widget/dark/${tipo}/${id}?tracklist=true`;
        executarAudioSessao(urlEmbedDeezer, `Deezer ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`, true);
        return; 
    } 
    
    if (inputUrl.includes("http://") || inputUrl.includes("https://")) {
        executarAudioSessao(inputUrl, "Link de Áudio Direto", false);
        return;
    } 
    
    alert("Não consegui identificar um link válido do YouTube, Deezer ou áudio direto.");
}

function carregarLofiPadrao() {
    executarAudioSessao("https://stream.zeno.fm/0r0xa792kwzuv", "Rádio Lofi Chill", false);
}

function executarAudioSessao(urlAudio, nomeRotulo, isIframe = false) {
    let playerNativo = document.getElementById("playerAudioNativo");
    let iframeYoutube = document.getElementById("playerYoutubeIframe"); 
    let wrapNativo = document.getElementById("wrapperAudioNativo");
    let wrapYoutube = document.getElementById("wrapperAudioYoutube");

    if(previewTimerInterval) clearInterval(previewTimerInterval);

    document.getElementById("lblNomeMusicaTocando").innerText = nomeRotulo;
    document.getElementById("containerMiniPlayer").classList.remove("hidden");
    fecharModal("modalMusica");

    if(isIframe) {
        try {
            playerNativo.pause();
            playerNativo.removeAttribute('src');
            playerNativo.load();
        } catch(err) { console.log("Player nativo limpo."); }
        
        wrapNativo.classList.add("hidden");
        wrapYoutube.classList.remove("hidden");
        iframeYoutube.src = urlAudio;
        
        let segundos = 0;
        previewTimerInterval = setInterval(() => {
            segundos++;
            let mins = Math.floor(segundos / 60).toString().padStart(2, '0');
            let secs = (segundos % 60).toString().padStart(2, '0');
            document.getElementById("lblNomeMusicaTocando").innerText = `${nomeRotulo} (⏱️ ${mins}:${secs})`;
        }, 1000);

    } else {
        iframeYoutube.src = "";
        wrapYoutube.classList.add("hidden");
        wrapNativo.classList.remove("hidden");
        playerNativo.src = urlAudio;
        
        playerNativo.play()
            .then(() => {
                document.getElementById("btnPlayPauseCustom").innerText = "⏸ Pausar";
                document.getElementById("btnPlayPauseCustom").className = "orange";
            }).catch((error) => {
                document.getElementById("btnPlayPauseCustom").innerText = "▶ Tocar";
                document.getElementById("btnPlayPauseCustom").className = "green";
            });

        previewTimerInterval = setInterval(() => {
            if(playerNativo.duration) {
                let atualMin = Math.floor(playerNativo.currentTime / 60).toString().padStart(2, '0');
                let atualSec = Math.floor(playerNativo.currentTime % 60).toString().padStart(2, '0');
                let totalMin = Math.floor(playerNativo.duration / 60).toString().padStart(2, '0');
                let totalSec = Math.floor(playerNativo.duration % 60).toString().padStart(2, '0');
                document.getElementById("lblNomeMusicaTocando").innerText = `${nomeRotulo} (${atualMin}:${atualSec} / ${totalMin}:${totalSec})`;
            }
        }, 500);
    }
}

function alternarPlayAudio() {
    let player = document.getElementById("playerAudioNativo");
    let btn = document.getElementById("btnPlayPauseCustom");
    if (player.paused) {
        player.play(); btn.innerText = "⏸ Pausar"; btn.className = "orange";
    } else {
        player.pause(); btn.innerText = "▶ Tocar"; btn.className = "green";
    }
}

function fecharMiniPlayer() {
    if(previewTimerInterval) clearInterval(previewTimerInterval);
    let player = document.getElementById("playerAudioNativo");
    player.pause(); 
    player.src = "";
    document.getElementById("playerYoutubeIframe").src = "";
    document.getElementById("containerMiniPlayer").classList.add("hidden");
}