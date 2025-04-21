// Configuração do Firebase - Substitua com suas credenciais
const firebaseConfig = {
  apiKey: "AIzaSyCwTNcpr_r75HH0igBtNyEbKvfuLkVFHiU",
  authDomain: "rifalidiane-fde3b.firebaseapp.com",
  databaseURL: "https://rifalidiane-fde3b-default-rtdb.firebaseio.com", // ADICIONE ESTA LINHA
  projectId: "rifalidiane-fde3b",
  storageBucket: "rifalidiane-fde3b.appspot.com", // Corrigi este valor
  messagingSenderId: "649359518677",
  appId: "1:649359518677:web:879b4ed9fa5150d24d2b5c"
};

// Restante do código permanece igual...

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Variáveis globais
let playerName = "";
let roomCode = "";
let playerId = "";
let isHost = false;
let playerRole = "";
let gameStarted = false;

// Elementos da DOM
const loginContainer = document.getElementById('login-container');
const lobbyContainer = document.getElementById('lobby-container');
const gameContainer = document.getElementById('game-container');
const playerNameInput = document.getElementById('player-name');
const roomCodeInput = document.getElementById('room-code');
const joinRoomBtn = document.getElementById('join-room');
const createRoomBtn = document.getElementById('create-room');
const displayRoomCode = document.getElementById('display-room-code');
const playersList = document.getElementById('players-ul');
const hostControls = document.getElementById('host-controls');
const startGameBtn = document.getElementById('start-game');
const resetGameBtn = document.getElementById('reset-game');
const leaveRoomBtn = document.getElementById('leave-room');
const roleTitle = document.getElementById('role-title');
const roleDescription = document.getElementById('role-description');
const gameInstructions = document.getElementById('game-instructions');
const gameActions = document.getElementById('game-actions');
const revealRoleBtn = document.getElementById('reveal-role');

// Event Listeners
joinRoomBtn.addEventListener('click', joinRoom);
createRoomBtn.addEventListener('click', createRoom);
startGameBtn.addEventListener('click', startGame);
resetGameBtn.addEventListener('click', resetRoom);
leaveRoomBtn.addEventListener('click', leaveRoom);
revealRoleBtn.addEventListener('click', revealRole);

// Função para gerar um ID aleatório
function generateId() {
    return 'xxxx-xxxx-xxx-xxxx'.replace(/[x]/g, function() {
        return Math.floor(Math.random() * 16).toString(16);
    });
}

// Função para criar uma sala
function createRoom() {
    playerName = playerNameInput.value.trim();
    if (!playerName) {
        alert("Por favor, digite seu nome");
        return;
    }
    
    roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    playerId = generateId();
    isHost = true;
    
    // Cria a sala no Firebase
    const roomRef = database.ref(`rooms/${roomCode}`);
    
    roomRef.set({
        host: playerId,
        gameStarted: false,
        players: {
            [playerId]: {
                name: playerName,
                role: "",
                revealed: false
            }
        }
    });
    
    // Mostra o lobby
    showLobby();
    
    // Monitora mudanças na sala
    monitorRoom();
}

// Função para entrar em uma sala existente
function joinRoom() {
    playerName = playerNameInput.value.trim();
    roomCode = roomCodeInput.value.trim();
    
    if (!playerName || !roomCode) {
        alert("Por favor, preencha todos os campos");
        return;
    }
    
    playerId = generateId();
    
    const roomRef = database.ref(`rooms/${roomCode}`);
    
    roomRef.once('value').then(snapshot => {
        if (!snapshot.exists()) {
            alert("Sala não encontrada. Verifique o código.");
            return;
        }
        
        const roomData = snapshot.val();
        
        if (roomData.gameStarted) {
            alert("O jogo já começou nesta sala. Você não pode entrar agora.");
            return;
        }
        
        // Adiciona o jogador à sala
        roomRef.child(`players/${playerId}`).set({
            name: playerName,
            role: "",
            revealed: false
        });
        
        // Mostra o lobby
        showLobby();
        
        // Monitora mudanças na sala
        monitorRoom();
    });
}

// Função para mostrar o lobby
function showLobby() {
    loginContainer.style.display = 'none';
    lobbyContainer.style.display = 'flex';
    gameContainer.style.display = 'none';
    
    displayRoomCode.textContent = roomCode;
    
    if (isHost) {
        hostControls.style.display = 'block';
    } else {
        hostControls.style.display = 'none';
    }
}

// Função para monitorar mudanças na sala
function monitorRoom() {
    const roomRef = database.ref(`rooms/${roomCode}`);
    
    roomRef.on('value', snapshot => {
        const roomData = snapshot.val();
        
        if (!roomData) {
            // Sala foi deletada
            alert("A sala foi encerrada pelo host.");
            window.location.reload();
            return;
        }
        
        // Atualiza a lista de jogadores
        updatePlayersList(roomData.players);
        
        // Verifica se o jogo começou
        if (roomData.gameStarted && !gameStarted) {
            gameStarted = true;
            startPlayerGame(roomData.players[playerId].role);
        }
        
        // Verifica se o jogo foi reiniciado
        if (!roomData.gameStarted && gameStarted) {
            gameStarted = false;
            showLobby();
        }
    });
}

// Atualiza a lista de jogadores
function updatePlayersList(players) {
    playersList.innerHTML = '';
    
    for (const [id, player] of Object.entries(players)) {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${player.name}</span>
            ${id === playerId ? '<span class="you-badge">(Você)</span>' : ''}
            ${player.role && player.revealed ? `<span class="role-badge">${getRoleName(player.role)}</span>` : ''}
        `;
        playersList.appendChild(li);
    }
}

// Inicia o jogo (apenas host)
function startGame() {
    const roomRef = database.ref(`rooms/${roomCode}`);
    
    roomRef.once('value').then(snapshot => {
        const roomData = snapshot.val();
        const players = roomData.players;
        const playerIds = Object.keys(players);
        const playerCount = playerIds.length;
        
        if (playerCount < 3) {
            alert("São necessários pelo menos 3 jogadores para começar o jogo.");
            return;
        }
        
        // Define os papéis
        const roles = assignRoles(playerCount);
        
        // Atualiza os papéis dos jogadores
        const updates = {};
        playerIds.forEach((id, index) => {
            updates[`players/${id}/role`] = roles[index];
            updates[`players/${id}/revealed`] = false;
        });
        
        updates['gameStarted'] = true;
        
        roomRef.update(updates);
    });
}

// Atribui papéis aleatórios
function assignRoles(playerCount) {
    const roles = [];
    
    // Sempre 1 assassino e 1 vítima
    roles.push('assassin');
    roles.push('victim');
    
    // Pelo menos 1 detetive
    roles.push('detective');
    
    // O restante são inocentes ou detetives extras
    const remaining = playerCount - 3;
    for (let i = 0; i < remaining; i++) {
        // 50% de chance de ser detetive ou inocente
        roles.push(Math.random() > 0.5 ? 'detective' : 'innocent');
    }
    
    // Embaralha os papéis
    return shuffleArray(roles);
}

// Embaralha um array
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Inicia o jogo para um jogador
function startPlayerGame(role) {
    playerRole = role;
    loginContainer.style.display = 'none';
    lobbyContainer.style.display = 'none';
    gameContainer.style.display = 'flex';
    
    // Mostra o botão para revelar o papel
    gameActions.style.display = 'block';
    roleTitle.textContent = "Bem-vindo ao Jogo";
    roleDescription.textContent = "Clique no botão abaixo para revelar seu papel no jogo.";
    gameInstructions.textContent = "Não compartilhe seu papel com outros jogadores até o momento apropriado!";
}

// Revela o papel do jogador
function revealRole() {
    const roomRef = database.ref(`rooms/${roomCode}/players/${playerId}`);
    roomRef.update({ revealed: true });
    
    gameActions.style.display = 'none';
    
    // Configura a interface com base no papel
    switch (playerRole) {
        case 'assassin':
            roleTitle.innerHTML = '<i class="fas fa-skull"></i> Assassino';
            roleDescription.textContent = "Você é o assassino! Seu objetivo é eliminar a vítima sem ser descoberto pelos detetives.";
            gameInstructions.innerHTML = `
                <h3>Instruções:</h3>
                <ul>
                    <li>Descubra quem é a vítima e tente "eliminá-la" sem ser pego</li>
                    <li>Use sua astúcia para enganar os detetives</li>
                    <li>Se você for descoberto, os detetives vencerão</li>
                </ul>
            `;
            break;
            
        case 'victim':
            roleTitle.innerHTML = '<i class="fas fa-user-injured"></i> Vítima';
            roleDescription.textContent = "Você é a vítima! O assassino está tentando te eliminar - descubra quem é antes que seja tarde!";
            gameInstructions.innerHTML = `
                <h3>Instruções:</h3>
                <ul>
                    <li>Você não sabe quem é o assassino</li>
                    <li>Tente descobrir pistas e se proteger</li>
                    <li>Se você descobrir o assassino antes de ser "eliminado", você e os detetives vencerão</li>
                </ul>
            `;
            break;
            
        case 'detective':
            roleTitle.innerHTML = '<i class="fas fa-search"></i> Detetive';
            roleDescription.textContent = "Você é um detetive! Seu objetivo é descobrir quem é o assassino antes que ele elimine a vítima.";
            gameInstructions.innerHTML = `
                <h3>Instruções:</h3>
                <ul>
                    <li>Investigue os outros jogadores e colete pistas</li>
                    <li>Trabalhe em equipe com outros detetives</li>
                    <li>Se você descobrir o assassino antes que ele elimine a vítima, você vence</li>
                </ul>
            `;
            break;
            
        default: // innocent
            roleTitle.innerHTML = '<i class="fas fa-user"></i> Inocente';
            roleDescription.textContent = "Você é um inocente! Ajude os detetives a descobrir quem é o assassino, mas cuidado - você pode ser confundido com o criminoso!";
            gameInstructions.innerHTML = `
                <h3>Instruções:</h3>
                <ul>
                    <li>Você não é o assassino, mas também não é um detetive</li>
                    <li>Ajude os detetives com informações, mas tome cuidado para não parecer suspeito</li>
                    <li>Se os detetives descobrirem o assassino, você vence junto com eles</li>
                </ul>
            `;
    }
}

// Reinicia a sala (apenas host)
function resetRoom() {
    const roomRef = database.ref(`rooms/${roomCode}`);
    
    // Reseta todos os jogadores
    roomRef.once('value').then(snapshot => {
        const players = snapshot.val().players;
        const updates = {};
        
        for (const id in players) {
            updates[`players/${id}/role`] = "";
            updates[`players/${id}/revealed`] = false;
        }
        
        updates['gameStarted'] = false;
        roomRef.update(updates);
    });
}

// Sai da sala
function leaveRoom() {
    const roomRef = database.ref(`rooms/${roomCode}`);
    
    if (isHost) {
        // Host saindo - deleta a sala
        roomRef.remove();
    } else {
        // Jogador normal saindo - remove-se da lista
        roomRef.child(`players/${playerId}`).remove();
    }
    
    window.location.reload();
}

// Retorna o nome do papel para exibição
function getRoleName(role) {
    switch (role) {
        case 'assassin': return 'Assassino';
        case 'victim': return 'Vítima';
        case 'detective': return 'Detetive';
        default: return 'Inocente';
    }
}
