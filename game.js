const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 90;
const MAX_BALLS = 4;

let player = { x: 20, y: canvas.height/2 - PADDLE_HEIGHT/2, width: PADDLE_WIDTH, height: PADDLE_HEIGHT, score: 0, color: '#00f0ff' };
let computer = { x: canvas.width - PADDLE_WIDTH - 20, y: canvas.height/2 - PADDLE_HEIGHT/2, width: PADDLE_WIDTH, height: PADDLE_HEIGHT, score: 0 };
let balls = [];
let keys = {};
let gameRunning = true;
let level = 1;
let highScores = JSON.parse(localStorage.getItem('teslaPongScores')) || [];

// Audio (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(freq, duration, type = 'sine', volume = 0.3) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    setTimeout(() => osc.stop(), duration);
}

// Create ball
function createBall() {
    return {
        x: canvas.width / 2,
        y: canvas.height / 2,
        size: 9,
        dx: (Math.random() > 0.5 ? 5 : -5) * (1 + level * 0.1),
        dy: (Math.random() - 0.5) * 8,
        speed: 5 + level * 0.5
    };
}

balls.push(createBall());

function selectAvatar(el) {
    document.querySelectorAll('.avatar').forEach(a => a.classList.remove('selected'));
    el.classList.add('selected');
    player.color = el.dataset.color;
}

function startGame() {
    document.getElementById('avatarScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    resetGame();
    gameLoop();
}

function updateScores() {
    document.getElementById('playerScore').textContent = player.score;
    document.getElementById('computerScore').textContent = computer.score;
    document.getElementById('level').textContent = `LVL ${level}`;
}

function checkLevelUp() {
    const totalPoints = player.score + computer.score;
    const newLevel = Math.floor(totalPoints / 5) + 1;
    if (newLevel > level) {
        level = newLevel;
        playSound(800, 200, 'sawtooth', 0.4);
        // Add extra ball
        if (balls.length < MAX_BALLS) balls.push(createBall());
    }
}

function resetBall(ball) {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * (5 + level * 0.6);
    ball.dy = (Math.random() - 0.5) * 9;
}

// Collision helper
function paddleCollision(ball, paddle) {
    if (ball.x - ball.size < paddle.x + paddle.width &&
        ball.x + ball.size > paddle.x &&
        ball.y > paddle.y && ball.y < paddle.y + paddle.height) {
        
        ball.dx = -ball.dx * 1.05; // slight speed up
        const hitPos = (ball.y - (paddle.y + paddle.height/2)) / (paddle.height/2);
        ball.dy = hitPos * 8;
        playSound(600 + Math.random()*400, 60, 'square', 0.4);
        return true;
    }
    return false;
}

function update() {
    if (!gameRunning) return;

    // Player movement
    if (keys['ArrowUp'] || keys['w']) player.y -= 8;
    if (keys['ArrowDown'] || keys['s']) player.y += 8;

    // Mouse support
    // (You can enhance mouse follow if desired)

    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

    // AI (improves with level)
    const aiSpeed = 5.5 + level * 0.6;
    balls.forEach(ball => {
        const targetY = ball.y - computer.height/2 + (Math.random()*20 - 10);
        if (computer.y + computer.height/2 < targetY) computer.y += aiSpeed;
        if (computer.y + computer.height/2 > targetY) computer.y -= aiSpeed;
    });
    computer.y = Math.max(0, Math.min(canvas.height - computer.height, computer.y));

    // Update balls
    balls.forEach((ball, index) => {
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Wall bounce
        if (ball.y - ball.size < 0 || ball.y + ball.size > canvas.height) {
            ball.dy = -ball.dy;
            playSound(300, 40);
        }

        // Paddle hits
        if (paddleCollision(ball, player) || paddleCollision(ball, computer)) {}

        // Scoring
        if (ball.x < 0) {
            computer.score++;
            playSound(200, 300, 'sawtooth', 0.5);
            resetBall(ball);
            updateScores();
            checkLevelUp();
        }
        if (ball.x > canvas.width) {
            player.score++;
            playSound(900, 150);
            resetBall(ball);
            updateScores();
            checkLevelUp();
        }
    });

    // Win condition example
    if (player.score >= 11 || computer.score >= 11) {
        gameRunning = false;
        const winner = player.score > computer.score ? "PLAYER" : "AI";
        alert(`MISSION ${winner === "PLAYER" ? "SUCCESS" : "FAILED"} — ${winner} WINS!`);
        saveHighScore(Math.max(player.score, computer.score));
    }
}

function draw() {
    // Background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid (Tesla cyber feel)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }

    // Center line
    ctx.setLineDash([15, 10]);
    ctx.strokeStyle = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(canvas.width/2, 0);
    ctx.lineTo(canvas.width/2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Paddles
    ctx.shadowBlur = 20;
    ctx.shadowColor = player.color;
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.shadowColor = '#ff00aa';
    ctx.fillStyle = '#ff00aa';
    ctx.fillRect(computer.x, computer.y, computer.width, computer.height);
    ctx.shadowBlur = 0;

    // Balls
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#ffffff';
    balls.forEach(ball => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.shadowBlur = 0;
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Controls
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

document.getElementById('resetBtn').addEventListener('click', resetGame);
document.getElementById('pauseBtn').addEventListener('click', () => {
    gameRunning = !gameRunning;
    document.getElementById('pauseBtn').textContent = gameRunning ? 'PAUSE' : 'RESUME';
});

function resetGame() {
    player.score = 0;
    computer.score = 0;
    level = 1;
    balls = [createBall()];
    updateScores();
    gameRunning = true;
}

function saveHighScore(score) {
    highScores.push({score, date: new Date().toLocaleDateString()});
    highScores.sort((a,b) => b.score - a.score);
    highScores = highScores.slice(0, 5);
    localStorage.setItem('teslaPongScores', JSON.stringify(highScores));
    renderLeaderboard();
}

function renderLeaderboard() {
    const list = document.getElementById('highScoresList');
    list.innerHTML = highScores.map((entry, i) => 
        `<li>${i+1}. ${entry.score} pts — ${entry.date}</li>`
    ).join('');
}

// Init leaderboard
renderLeaderboard();