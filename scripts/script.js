// ==========================
// GLOBAL VARIABLES
// ==========================

const keySounds = Array.from({ length: 7 }, (_, i) => new Audio(`assets/audio/typing${i + 1}.wav`));
const terminalSounds = ['startup', 'terminal', 'click1', 'click2'].map(name => new Audio(`assets/audio/${name}.wav`));

let introLines = [];
let commandsResponse = {};

const crtterminal = document.querySelector('.crt-terminal');
const terminal = document.querySelector('.terminal-output');
const input = document.getElementById("terminal-input");
const caret = document.getElementById("input-caret");
const windowDragable = document.getElementById("draggable-window");
const windowHeader = document.getElementById("draggable-header");
const windowRightside = document.querySelector(".crt-righside");
const terminalInput = document.querySelector('.terminal-input-line');

let lineIndex = 0;
let charIndex = 0;

let audioEnabled = true;
let isTyping = false;

let currentStartupSound = null;
let currentLoopSound = null;

// ==========================
// INITIALIZATION
// ==========================

const loadMessages = () => {
  fetch('messages.json')
    .then(res => res.json())
    .then(data => {
      introLines = data.introLines;
      commandsResponse = data.commandsResponse;
      for (const key in commandsResponse) {
        if (key !== 'arts' && Array.isArray(commandsResponse[key])) {
          commandsResponse[key] = commandsResponse[key].join('\n');
        }
      }
    })
    .catch(err => {
      console.error("Failed to load message templates:", err);
      terminal.textContent = ">> Failed to load system templates.";
    });
};

// ==========================
// CARET / INPUT / SOUND
// ==========================

const playSound = (sound, volume = 0.5, rate = 1.0) => {
  if (!audioEnabled) return;
  const s = sound.cloneNode();
  s.volume = volume;
  s.playbackRate = rate;
  s.play();
};

const playTypingSound = () => {
  const sound = keySounds[Math.floor(Math.random() * keySounds.length)];
  playSound(sound, 0.8 + Math.random() * 0.2, 0.95 + Math.random() * 0.1);
};

const updateCaretPosition = () => {
    const span = document.createElement('span');
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.style.fontFamily = "'VT323', monospace";
    span.style.fontSize = '18px';
    span.textContent = input.value;
    document.body.appendChild(span);
    caret.style.left = `${span.offsetWidth + 2}px`;
    document.body.removeChild(span);
};

const typeToTerminal = (msg, target, delay = 20, callback = null) => {
  let i = 0;
  isTyping = true;

  const typeChar = () => {
    if (i < msg.length) {
      target.textContent += msg.charAt(i++);
      requestAnimationFrame(() => {
        crtterminal.scrollTop = crtterminal.scrollHeight;
      });
      setTimeout(typeChar, delay);
    } else {
        isTyping = false;
        if (callback) callback();
    }
  };

  typeChar();
};

// ==========================
// UI COMPONENTS
// ==========================

const attachWindowControls = win => {
    let isMaximized = false;
    let prev = {};
  
    const minimizeBtn = win.querySelector('.minimize');
    const closeBtn = win.querySelector('.close');
    const maximizeBtn = win.querySelector('.maximize'); 
  
    if (maximizeBtn) {
      maximizeBtn.onclick = () => {
        if (!isMaximized) {
          prev = {
            top: win.style.top,
            left: win.style.left,
            width: win.style.width,
            height: win.style.height
          };
          Object.assign(win.style, {
            top: '0', left: '0', width: '100vw', height: '100vh'
          });
          maximizeBtn.textContent = '🗗';
        } else {
          Object.assign(win.style, prev);
          maximizeBtn.textContent = '☐';
        }
        isMaximized = !isMaximized;
      };
    }
  
    closeBtn.onclick = () => win.remove();
  
    minimizeBtn.onclick = () => {

      const body = win.querySelector('.window-body');
      const res = win.querySelector('.resizer');
      const minimized = body.style.display === 'none';
  
      body.style.display = minimized ? 'block' : 'none';
      if (res) res.style.display = minimized ? 'block' : 'none';
      win.style.height = minimized ? '' : `${win.querySelector('.window-header').offsetHeight}px`;
      win.style.minHeight = minimized ? '500px' : 'auto';
      minimizeBtn.textContent = minimized ? '–' : '+';
      win.style.cursor = minimized ? 'grab' : 'default';
    };
};

const makeDraggable = el => {
    let offsetX = 0, offsetY = 0;
  
    const header = el.querySelector('#draggable-header');
    if (!header) return console.warn('No header found for dragging');
  
    const onMouseMove = e => {
      const c = document.querySelector('.content').getBoundingClientRect();
      const w = el.getBoundingClientRect();
      const left = Math.max(0, Math.min(e.clientX - offsetX, (c.width - 20) - w.width));
      const top = Math.max(0, Math.min(e.clientY - offsetY, c.height - w.height));
      Object.assign(el.style, { left: `${left}px`, top: `${top}px` });
    };
  
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      el.style.cursor = "grab";
      document.body.style.userSelect = '';
    };
  
    header.onmousedown = e => {
      e.preventDefault();
      offsetX = e.clientX - el.offsetLeft;
      offsetY = e.clientY - el.offsetTop;
      el.style.cursor = "grabbing";
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };
};

const initResizer = win => {
    const resizer = win.querySelector('.resizer');
  
    if (!resizer) return; 
  
    resizer.onmousedown = e => {
      e.preventDefault();
  
      window.onmousemove = evt => {
        win.style.width = `${evt.clientX - win.offsetLeft}px`;
        win.style.height = `${evt.clientY - win.offsetTop}px`;
      };
  
      window.onmouseup = () => {
        window.onmousemove = null;
        window.onmouseup = null;
      };
    };
};

// ==========================
// TERMINAL LOGIC
// ==========================

const terminalSystem = () => {
  if (lineIndex < introLines.length) {
    const line = introLines[lineIndex];
    if (charIndex < line.length) {
      terminal.textContent += line.charAt(charIndex++);
      setTimeout(terminalSystem, 15);
    } else {
      terminal.textContent += "\n";
      charIndex = 0;
      lineIndex++;
      setTimeout(terminalSystem, 300);
    }
  } else {
    terminal.classList.remove('cursor');
    terminalInput.style.display = 'flex';
  }
};

const handleCommand = async cmdLine => {
  const [cmd, ...args] = cmdLine.split(' ');
  const argStr = args.join(' ');

  if (cmd === 'clear') {
    terminal.textContent = '';
  } else if (cmd === 'ping') {
    typeToTerminal("Pinging https://google.com ...\n", terminal);
    try {
      const start = performance.now();
      await fetch("https://httpbin.org/get", { cache: 'no-store' });
      const ping = Math.round(performance.now() - start);
      typeToTerminal(`Ping: ${ping} ms\n`, terminal);
    } catch {
      typeToTerminal("Ping failed: unable to reach the server.\n", terminal);
    }
  } else if (cmd === 'audio') {
    if (argStr === 'off') {
      audioEnabled = false;
  
      if (currentStartupSound) {
        currentStartupSound.pause();
        currentStartupSound.currentTime = 0;
        currentStartupSound = null;
      }
  
      if (currentLoopSound) {
        currentLoopSound.pause();
        currentLoopSound.currentTime = 0;
        currentLoopSound = null;
      }
  
      typeToTerminal("Audio disabled.\n", terminal);
    } else if (argStr === 'on') {
      audioEnabled = true;
      typeToTerminal("Audio enabled.\n", terminal);

      if (!currentLoopSound) {
        currentLoopSound = terminalSounds[1].cloneNode(); 
        currentLoopSound.volume = 0.5;
        currentLoopSound.loop = true;
        currentLoopSound.play();
      }
    } else {
      typeToTerminal(commandsResponse[cmd], terminal);
    }
  } else if (cmd === 'arts') {
    const arts = commandsResponse.arts;
    const count = parseInt(argStr, 10);
    if (!arts) return typeToTerminal("Arts data not loaded yet. Please wait.\n", terminal);
    if (!argStr || isNaN(count) || count <= 0) {
      return typeToTerminal(`Please enter correctly: arts <number>\nCurrently available: ${Object.keys(arts).length} arts.`, terminal);
    }
    if (arts[count]) {
      const artLines = arts[count].join('\n');
      typeToTerminal(artLines, terminal);
    } else {
      typeToTerminal(`No art found with number ${count}.`, terminal);
    }
  } else if (cmd === 'echo') {
    typeToTerminal(argStr ? `> ${argStr}\n` : "Usage: echo <text>\n", terminal);
  } else if (cmd === 'projects') {
    const key = args[0];
    if (!key) return typeToTerminal(commandsResponse[cmd], terminal);
    const project = commandsResponse.projectslist[key];
    if (!project) return typeToTerminal(`Project \"${key}\" not found.`, terminal);
    if (document.getElementById(`window-${key}`)) return typeToTerminal(`\"${key}\" is already open.`, terminal);

    const win = document.createElement('div');
    win.className = 'crt-window';
    win.id = `window-${key}`;
    win.innerHTML = `
      <div id="draggable-header" class="window-header">
        <span class="window-title">${project.title}</span>
        <div class="window-controls">
            <button class="minimize">–</button>
            <button class="maximize">☐</button> 
            <button class="close">×</button>
        </div>
      </div>
      <div class="window-body">
        <p class="window-desc">${project.description}</p>
        <div class="project-images">
            ${project.images.map(src => `<img src="${src}" alt="Project screenshot" class="project-screenshot">`).join('')}
        </div>
      </div>
      <div class="resizer"></div>
    `;
    windowRightside.appendChild(win); 
    makeDraggable(win);
    attachWindowControls(win);
    initResizer(win);
    typeToTerminal(`Opened \"${key}\" in new window.`, terminal);
  } else if (commandsResponse.hasOwnProperty(cmd)) {
    typeToTerminal(commandsResponse[cmd], terminal);
  } else if (cmd !== '') {
    typeToTerminal(`Unknown command: ${cmdLine}`, terminal);
  }
};

const startupLoading = (interval, time) => {
  const [startupSound, loopSound] = terminalSounds;
  loopSound.loop = true;

  const screen = document.getElementById('window-screen');
  const loading = document.getElementById('loading-text');
  const container = document.querySelector('.loading-container');
  const symbols = ['▱▱▱','▰▱▱','▰▰▱','▰▰▰','▱▰▰','▱▱▰'];
  let i = 0;

  const spinner = setInterval(() => {
    loading.textContent = `${symbols[i++ % symbols.length]} Loading`;
  }, interval);

  setTimeout(() => {
    container.classList.add('fade-out');
    container.onanimationend = () => {
      container.style.display = 'none';
      screen.style.display = 'block';
      requestAnimationFrame(() => screen.classList.add('fade-in'));

      if (audioEnabled) {
        currentStartupSound = startupSound.cloneNode();
        currentStartupSound.volume = 0.5;
        currentStartupSound.play();
      
        currentStartupSound.onended = () => {
          currentLoopSound = loopSound;
          currentLoopSound.volume = 0.5;
          currentLoopSound.loop = true;
          currentLoopSound.play();
        };
      } else {
        if (currentLoopSound) {
          currentLoopSound.pause();
          currentLoopSound.currentTime = 0;
          currentLoopSound = null;
        }
      }

      terminalSystem();
    };
    clearInterval(spinner);
  }, time);
};

// ==========================
// EVENT BINDINGS
// ==========================

input.oninput = input.onclick = input.onkeydown = updateCaretPosition;

input.onkeydown = e => {
  if (e.key === "Enter") {
    if (isTyping) {
      e.preventDefault();
      return;
    }
    playSound(keySounds[0]);
    e.preventDefault();
    const command = input.value.trim().toLowerCase();
    terminal.textContent += `\n> ${command}\n`;
    crtterminal.scrollTop = crtterminal.scrollHeight;  
    input.value = "";
    updateCaretPosition();
    handleCommand(command);
  } else if (!['Shift','Control','Alt','Meta','Backspace'].includes(e.key)) {
    playTypingSound();
  }
};

document.querySelector('.crt-terminal').onclick = () => input.focus();
window.addEventListener('mousedown', () => {
  playSound(terminalSounds[2], 0.5, 0.95 + Math.random() * 0.1);
});

window.addEventListener('mouseup', () => {
  playSound(terminalSounds[3], 0.5, 1.0 + Math.random() * 0.1);
});

window.onload = () => {
  loadMessages();
  startupLoading(200, 3000);
  setTimeout(updateCaretPosition, 100);
  setTimeout(() => input.focus({ preventScroll: true }), 5100);
};