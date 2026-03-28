let achievements = [];
let musicPlayer1, musicPlayer2;
let activePlayer;

const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');
const loaderScreen = document.getElementById('loader-screen');
const frame = document.getElementById('broadcast-frame');

// TTS Cleanup Logic
function sanitizeForTTS(text) {
    return text.replace(/\b150\b/g, "देढ़ सौ")
               .replace(/2025/g, "दो हज़ार पच्चीस")
               .replace(/2026/g, "दो हज़ार छब्बीस")
               .replace(/SMC/gi, "एस एम सी")
               .replace(/GSSS/gi, "जी एस एस एस")
               .replace(/\b10\b/g, "दस")
               .replace(/\b12\b/g, "बारह");
}

async function init() {
    try {
        console.log("Fetching JSON from GitHub...");
        const response = await fetch('achievements.json');
        if (!response.ok) throw new Error(`JSON not found at ${window.location.href}achievements.json`);
        
        achievements = await response.json();
        achievements.sort((a, b) => new Date(b.date_iso) - new Date(a.date_iso));
        
        musicPlayer1 = document.getElementById('bg-music-1');
        musicPlayer2 = document.getElementById('bg-music-2');
        activePlayer = musicPlayer1;

        console.log("Success: JSON loaded. Total slides:", achievements.length);
        checkVoices();
    } catch (e) {
        console.error("Critical Load Error:", e);
        document.body.innerHTML = `<h1 style='color:white; padding:50px;'>Error: achievements.json missing or capitalization mismatch. <br><small>${e.message}</small></h1>`;
    }
}

// Ensure the "Natural" voice is ready
function checkVoices() {
    const voices = window.speechSynthesis.getVoices();
    // Hunt for Microsoft Swara Online (Natural)
    const swara = voices.find(v => v.name.includes('Swara') && v.name.includes('Online'));
    
    if (swara) {
        console.log("High-Quality Voice Found: Swara Online Natural");
        if (loaderScreen) loaderScreen.style.display = 'none';
        if (startScreen) startScreen.style.display = 'flex';
    } else if (voices.length > 5) {
        // Fallback if Swara isn't there but others are
        console.warn("Swara Natural not found. Using fallback:", voices[0].name);
        if (loaderScreen) loaderScreen.style.display = 'none';
        if (startScreen) startScreen.style.display = 'flex';
    } else {
        // Wait for Edge to connect to its cloud voices
        setTimeout(checkVoices, 500);
    }
}

async function playSlide(index) {
    if (index >= achievements.length) return;
    
    const slide = achievements[index];
    document.getElementById('date-tag').innerText = slide.display_date_hindi;
    document.getElementById('main-headline').innerText = slide.headline_hindi;
    
    const mediaStage = document.getElementById('media-stage');
    mediaStage.innerHTML = ''; 
    
    if (slide.media && slide.media.length > 0) {
        const item = slide.media[0];
        // THE PATH FIX: GitHub relative paths
        const mediaPath = `media/${item.file}`; 
        
        console.log(`Trying to load: ${mediaPath}`);

        if (item.type === 'image') {
            const img = document.createElement('img');
            img.src = mediaPath;
            img.onerror = () => {
                console.error(`IMAGE FAILED: ${mediaPath}. Check if file extension is .jpg vs .JPG on GitHub.`);
            };
            mediaStage.appendChild(img);
        } else {
            const vid = document.createElement('video');
            vid.src = mediaPath;
            vid.autoplay = true; vid.muted = false;
            mediaStage.appendChild(vid);
        }
    }

    const list = document.getElementById('bullet-list');
    list.innerHTML = '';
    slide.bullet_points_hindi.forEach(p => {
        const li = document.createElement('li');
        li.innerText = `• ${p}`;
        list.appendChild(li);
    });

    handleMusic(slide.bg_music);

    speak(slide.tts_script_hindi, () => {
        setTimeout(() => playSlide(index + 1), 4000);
    });

    let i = 0;
    const items = list.getElementsByTagName('li');
    const interval = setInterval(() => {
        if (i < items.length) { items[i].classList.add('visible'); i++; }
        else { clearInterval(interval); }
    }, 2500);
}

function handleMusic(file) {
    const nextPlayer = (activePlayer === musicPlayer1) ? musicPlayer2 : musicPlayer1;
    if (nextPlayer.src.includes(file)) return;
    
    nextPlayer.src = `media/${file}`;
    nextPlayer.volume = 0;
    nextPlayer.play().catch(e => console.warn("Music play failed. Check filename:", file));

    let vol = 0;
    const fade = setInterval(() => {
        if (vol < 0.25) {
            vol += 0.02;
            nextPlayer.volume = vol;
            if (activePlayer.volume > 0.02) activePlayer.volume -= 0.02;
        } else {
            activePlayer.pause();
            activePlayer = nextPlayer;
            clearInterval(fade);
        }
    }, 100);
}

function speak(text, callback) {
    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(sanitizeForTTS(text));
    const voices = window.speechSynthesis.getVoices();
    
    // STRICTLY TARGET SWARA NATURAL (Online)
    const swara = voices.find(v => v.name.includes('Swara') && v.name.includes('Online')) || 
                  voices.find(v => v.lang.includes('hi') && v.name.includes('Online'));

    utterance.voice = swara;
    utterance.rate = 0.88; 
    utterance.pitch = 1.0;

    utterance.onstart = () => { if(activePlayer) activePlayer.volume = 0.05; };
    utterance.onend = () => { if(activePlayer) activePlayer.volume = 0.25; callback(); };

    window.speechSynthesis.speak(utterance);
}

startBtn.addEventListener('click', () => {
    startScreen.style.display = 'none';
    frame.style.display = 'block';
    playSlide(0);
});

window.speechSynthesis.onvoiceschanged = checkVoices;
init();
