// Game State
const gameState = {
    score: 0,
    chainLength: 0,
    longestChain: 0,
    timeRemaining: 300, // 5 minutes in seconds
    baseTime: 8, // Starting time per task
    currentTime: 8,
    tasksCompleted: 0,
    gameStartTime: null,
    gameActive: false,
    timerInterval: null,
    countdownInterval: null
};

// Task Types
const taskTypes = {
    PATTERN: 'pattern',
    MEMORY: 'memory',
    LOGIC: 'logic',
    SEQUENCE: 'sequence',
    MATH: 'math'
};

// DOM Elements
const elements = {
    startScreen: document.getElementById('start-screen'),
    taskScreen: document.getElementById('task-screen'),
    gameoverScreen: document.getElementById('gameover-screen'),
    startBtn: document.getElementById('start-btn'),
    restartBtn: document.getElementById('restart-btn'),
    taskContent: document.getElementById('task-content'),
    timerBar: document.getElementById('timer-bar'),
    timerText: document.getElementById('timer-text'),
    score: document.getElementById('score'),
    chainLength: document.getElementById('chain-length'),
    timeLeft: document.getElementById('time-left'),
    chainLinks: document.getElementById('chain-links'),
    finalScore: document.getElementById('final-score'),
    finalChain: document.getElementById('final-chain'),
    timeSurvived: document.getElementById('time-survived')
};

// Sound Effects (using Web Audio API)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(frequency, duration, type = 'sine') {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

function playSuccess() {
    playSound(523.25, 0.15, 'sine'); // C5
    setTimeout(() => playSound(659.25, 0.15, 'sine'), 100); // E5
}

function playFailure() {
    playSound(220, 0.3, 'sawtooth'); // A3
}

function playChainAdd() {
    playSound(440 + (gameState.chainLength * 20), 0.1, 'square');
}

// Utility Functions
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomColor() {
    const colors = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function getRandomShape() {
    const shapes = ['⬤', '■', '▲', '♦', '★', '♥'];
    return shapes[Math.floor(Math.random() * shapes.length)];
}

// Task Generators
function generatePatternTask() {
    const patterns = [
        {
            question: 'Which one completes the pattern?',
            sequence: ['🔴', '🔵', '🔴', '🔵', '🔴', '?'],
            options: ['🔴', '🔵', '🟢', '🟡'],
            correct: 1
        },
        {
            question: 'What comes next?',
            sequence: ['■', '■', '▲', '■', '■', '▲', '■', '■', '?'],
            options: ['■', '▲', '⬤', '♦'],
            correct: 1
        },
        {
            question: 'Complete the sequence:',
            sequence: ['2', '4', '6', '8', '?'],
            options: ['9', '10', '12', '14'],
            correct: 1
        }
    ];
    
    // Generate random number pattern
    const start = getRandomInt(1, 5);
    const step = getRandomInt(2, 4);
    const seq = [start, start + step, start + step * 2, start + step * 3];
    const correctAnswer = start + step * 4;
    
    return {
        question: 'What number comes next?',
        content: seq.join(', ') + ', ?',
        options: shuffleArray([
            correctAnswer,
            correctAnswer + getRandomInt(1, 3),
            correctAnswer - getRandomInt(1, 3),
            correctAnswer + step + getRandomInt(1, 2)
        ]),
        correctAnswer: correctAnswer
    };
}

function generateMemoryTask() {
    const colors = shuffleArray(['🔴', '🔵', '🟢', '🟡', '🟣', '🟠']).slice(0, 4);
    const memorySequence = colors.join(' ');
    
    // Create distractor options
    const wrongOptions = [];
    for (let i = 0; i < 3; i++) {
        const wrong = shuffleArray(colors).join(' ');
        if (wrong !== memorySequence) wrongOptions.push(wrong);
    }
    
    return {
        question: 'Remember this sequence:',
        content: memorySequence,
        isMemory: true,
        options: shuffleArray([memorySequence, ...wrongOptions.slice(0, 2), 
                               colors.slice(0, 3).join(' ') + ' 🟤']),
        correctAnswer: memorySequence
    };
}

function generateLogicTask() {
    const logicTasks = [
        {
            question: 'Which one is different?',
            options: ['Cat', 'Dog', 'Car', 'Bird'],
            correctAnswer: 'Car'
        },
        {
            question: 'Which doesn\'t belong?',
            options: ['2', '4', '7', '6'],
            correctAnswer: '7'
        },
        {
            question: 'Odd one out:',
            options: ['Apple', 'Banana', 'Carrot', 'Orange'],
            correctAnswer: 'Carrot'
        },
        {
            question: 'Which is the odd one?',
            options: ['Square', 'Circle', 'Blue', 'Triangle'],
            correctAnswer: 'Blue'
        }
    ];
    
    return logicTasks[Math.floor(Math.random() * logicTasks.length)];
}

function generateMathTask() {
    const operations = [
        { op: '+', fn: (a, b) => a + b },
        { op: '-', fn: (a, b) => a - b },
        { op: '×', fn: (a, b) => a * b }
    ];
    
    const operation = operations[Math.floor(Math.random() * operations.length)];
    const a = getRandomInt(2, 12);
    const b = getRandomInt(2, 12);
    const correct = operation.fn(a, b);
    
    return {
        question: 'Quick math:',
        content: `${a} ${operation.op} ${b} = ?`,
        options: shuffleArray([
            correct,
            correct + getRandomInt(1, 3),
            correct - getRandomInt(1, 3),
            correct + getRandomInt(4, 7)
        ]),
        correctAnswer: correct
    };
}

function generateSequenceTask() {
    const sequences = [
        {
            question: 'What comes before?',
            content: 'B, C, D, E',
            options: ['A', 'F', 'Z', 'G'],
            correctAnswer: 'A'
        },
        {
            question: 'What comes after?',
            content: 'Monday, Tuesday, Wednesday',
            options: ['Thursday', 'Friday', 'Sunday', 'Monday'],
            correctAnswer: 'Thursday'
        },
        {
            question: 'Next in sequence:',
            content: 'Jan, Feb, Mar, Apr',
            options: ['May', 'Jun', 'Dec', 'Aug'],
            correctAnswer: 'May'
        }
    ];
    
    return sequences[Math.floor(Math.random() * sequences.length)];
}

// Task Generation
function generateTask() {
    const taskGenerators = [
        generatePatternTask,
        generateMemoryTask,
        generateLogicTask,
        generateMathTask,
        generateSequenceTask
    ];
    
    const generator = taskGenerators[Math.floor(Math.random() * taskGenerators.length)];
    return generator();
}

// Display Task
function displayTask(task) {
    let html = `<div class="task-question">${task.question}</div>`;
    
    if (task.content) {
        html += `<div style="font-size: 1.8rem; margin-bottom: 25px; font-weight: 600;">${task.content}</div>`;
    }
    
    if (task.isMemory) {
        // Show sequence briefly, then hide
        html += `<div id="memory-display" style="font-size: 2rem; margin-bottom: 25px;">${task.content}</div>`;
        html += `<div id="memory-prompt" style="display: none; margin-bottom: 25px; font-size: 1.2rem; color: #f59e0b;">What was the sequence?</div>`;
    }
    
    html += '<div class="task-options">';
    task.options.forEach((option, index) => {
        html += `<button class="option-btn" data-answer="${option}">${option}</button>`;
    });
    html += '</div>';
    
    elements.taskContent.innerHTML = html;
    
    // Add click handlers
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => handleAnswer(btn, task));
    });
    
    // Handle memory task timing
    if (task.isMemory) {
        setTimeout(() => {
            const display = document.getElementById('memory-display');
            const prompt = document.getElementById('memory-prompt');
            if (display && prompt) {
                display.style.display = 'none';
                prompt.style.display = 'block';
            }
        }, 2000);
    }
}

// Handle Answer
function handleAnswer(button, task) {
    const answer = button.dataset.answer;
    const correct = answer == task.correctAnswer;
    
    // Disable all buttons
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.cursor = 'not-allowed';
    });
    
    if (correct) {
        button.classList.add('correct');
        playSuccess();
        setTimeout(() => handleCorrectAnswer(), 500);
    } else {
        button.classList.add('incorrect');
        playFailure();
        setTimeout(() => handleIncorrectAnswer(), 800);
    }
}

// Handle Correct Answer
function handleCorrectAnswer() {
    gameState.chainLength++;
    gameState.longestChain = Math.max(gameState.longestChain, gameState.chainLength);
    gameState.tasksCompleted++;
    
    // Calculate score (base 10 points + chain multiplier)
    const points = 10 * gameState.chainLength;
    gameState.score += points;
    
    // Update displays
    updateStats();
    addChainLink();
    playChainAdd();
    
    // Decrease time every 5 tasks
    if (gameState.tasksCompleted % 5 === 0) {
        gameState.currentTime = Math.max(4, gameState.currentTime - 0.2);
    }
    
    // Load next task
    loadNextTask();
}

// Handle Incorrect Answer
function handleIncorrectAnswer() {
    // Break the chain
    breakChain();
    gameState.chainLength = 0;
    updateStats();
    
    // Continue with next task
    setTimeout(() => loadNextTask(), 1000);
}

// Chain Visual Management
function addChainLink() {
    const link = document.createElement('div');
    link.className = 'chain-link';
    link.textContent = gameState.chainLength;
    elements.chainLinks.appendChild(link);
    
    // Scroll to show latest link
    elements.chainLinks.parentElement.scrollLeft = elements.chainLinks.parentElement.scrollWidth;
}

function breakChain() {
    // Animate chain breaking
    const links = elements.chainLinks.querySelectorAll('.chain-link');
    links.forEach((link, index) => {
        setTimeout(() => {
            link.classList.add('breaking');
        }, index * 50);
    });
    
    // Clear chain after animation
    setTimeout(() => {
        elements.chainLinks.innerHTML = '';
    }, links.length * 50 + 500);
}

// Load Next Task
function loadNextTask() {
    const task = generateTask();
    displayTask(task);
    startTaskTimer();
}

// Timer Management
function startTaskTimer() {
    let timeLeft = gameState.currentTime;
    const timerBar = elements.timerBar.querySelector('::after') || elements.timerBar;
    
    // Clear existing timer
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    gameState.timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        
        // Update timer display
        elements.timerText.textContent = timeLeft.toFixed(1) + 's';
        
        // Update timer bar
        const percentage = (timeLeft / gameState.currentTime) * 100;
        elements.timerBar.style.setProperty('--timer-width', percentage + '%');
        
        // Update timer bar color based on time left
        elements.timerBar.classList.remove('warning', 'danger');
        if (percentage < 30) {
            elements.timerBar.classList.add('danger');
        } else if (percentage < 50) {
            elements.timerBar.classList.add('warning');
        }
        
        // Time's up
        if (timeLeft <= 0) {
            clearInterval(gameState.timerInterval);
            handleIncorrectAnswer();
        }
    }, 100);
}

// Update Stats Display
function updateStats() {
    elements.score.textContent = gameState.score.toLocaleString();
    elements.chainLength.textContent = gameState.chainLength;
    
    const minutes = Math.floor(gameState.timeRemaining / 60);
    const seconds = gameState.timeRemaining % 60;
    elements.timeLeft.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Game Timer (5 minute countdown)
function startGameTimer() {
    gameState.countdownInterval = setInterval(() => {
        gameState.timeRemaining--;
        updateStats();
        
        if (gameState.timeRemaining <= 0) {
            endGame();
        }
    }, 1000);
}

// Start Game
function startGame() {
    // Reset state
    gameState.score = 0;
    gameState.chainLength = 0;
    gameState.longestChain = 0;
    gameState.timeRemaining = 300;
    gameState.currentTime = gameState.baseTime;
    gameState.tasksCompleted = 0;
    gameState.gameStartTime = Date.now();
    gameState.gameActive = true;
    
    // Clear chain visual
    elements.chainLinks.innerHTML = '';
    
    // Switch screens
    elements.startScreen.classList.add('hidden');
    elements.gameoverScreen.classList.add('hidden');
    elements.taskScreen.classList.remove('hidden');
    
    // Start timers
    updateStats();
    startGameTimer();
    loadNextTask();
}

// End Game
function endGame() {
    gameState.gameActive = false;
    
    // Clear timers
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    if (gameState.countdownInterval) clearInterval(gameState.countdownInterval);
    
    // Calculate time survived
    const timeSurvived = 300 - gameState.timeRemaining;
    const minutes = Math.floor(timeSurvived / 60);
    const seconds = timeSurvived % 60;
    
    // Update final stats
    elements.finalScore.textContent = gameState.score.toLocaleString();
    elements.finalChain.textContent = gameState.longestChain;
    elements.timeSurvived.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Switch to game over screen
    elements.taskScreen.classList.add('hidden');
    elements.gameoverScreen.classList.remove('hidden');
}

// Event Listeners
elements.startBtn.addEventListener('click', startGame);
elements.restartBtn.addEventListener('click', startGame);

// Initialize
updateStats();

// Add CSS custom property for timer bar animation
const style = document.createElement('style');
style.textContent = `
    .timer-bar::after {
        width: var(--timer-width, 100%);
    }
`;
document.head.appendChild(style);
