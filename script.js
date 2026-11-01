const lyrics = document.getElementById("lyrics"),
    lrcInput = document.getElementById("lrc"),
    fileMetadata = document.getElementById("fileMetadata"),
    music = document.getElementById("music"),
    musicSelected = document.getElementById("musicSelected"),
    info = document.getElementById("info"),
    generate = document.getElementById("generate"),
    offsetInput = document.getElementById("offset"),
    fileControls = document.getElementById("fileControls"),
    errorMessage = document.getElementById("errorMessage"),
    audio = document.getElementById("audio");

const buttons = document.querySelectorAll("button, .customLabel");

const lyricDiv = document.getElementById("lyricDiv"),
    lyricFrameTemplate = document.getElementById("clone");

const data = {
    title: "",
    album: "",
    artist: "",
    author: "",
    by: ""
};

let lyricElements = [];
let isPlaying = false,
    isEditing = false,
    posInLyric = -1;
offset = 0;
timestamped = 0;

let lyricInput,
    previewInterval;

function sec2time(timeInSeconds) {
    let pad = function (num, size) { return ('000' + num).slice(size * -1); },
        time = parseFloat(timeInSeconds).toFixed(2),
        minutes = Math.floor(time / 60) % 60,
        seconds = Math.floor(time - minutes * 60),
        milliseconds = time.slice(-2);

    return pad(minutes, 2) + ':' + pad(seconds, 2) + '.' + pad(milliseconds, 2);
}
function time2sec(timestamp) {
    let regx = /(\d+):(\d{1,2})\.(\d+)/g;
    let match = regx.exec(timestamp);

    if (!match) return;
    return ((+match[1]) * 60) + (+match[2]) + ((+match[3]) / 10 ** (+match[3].length));
}
function trim(str) {
    return str.replace(/^\s+|\s+$/g, "");
}

//theme functions
function switchTheme(bool) {
    document.body.style.backgroundColor = bool ? "#12131a" : "white";

    document.getElementById("errWindow").style.backgroundColor = bool ? "#12131a" : "white";
    document.getElementById("errTitle").style.color = bool ? "black" : "white";
    document.getElementById("errTitle").style.backgroundColor = bool ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

    document.querySelectorAll("body *").forEach((elem) => elem.style.color = bool ? "white" : "black");
    buttons.forEach((elem) => {
        let style = window.getComputedStyle(elem),
            col = style.getPropertyValue('background-color').match(/\d+/g);

        elem.style.backgroundColor = bool ? `rgba(${col[0]},${col[1]},${col[2]}, 0.35)` : null;
    })
}
function toggleTheme(checkbox) {
    let checked = checkbox.checked;

    localStorage.setItem("darkTheme", checked);
    switchTheme(checked);
}

//lyric setup controls
async function clearTimestamps() {
    if (!(await windowConfirm("Clear all timestamps in the lyrics?"))) return;
    lyrics.value = lyrics.value.replace(/\[.*?]/g, "");
}
async function clearMetadata() {
    if (!(await windowConfirm("Clear all metadata for the file?"))) return;
    Object.keys(data).forEach((key) => {
        document.getElementById(key).value = "";
    });
}

//lyric editor functions
async function generateLyrics() {
    if (lyrics.value == "") return windowAlert("There is literally no lyrics, what's a lyric file without lyrics?");
    if (music.value == "") return windowAlert("No music was chosen to sync the lyrics! I can't just guess the music playing!");
    if (title.value == "") {
        if (!(await windowConfirm("No title was given! This will be replaced with the name of the file."))) return;
        title.value = music.files[0].name;
    }
    lyricInput = lyrics.value.split("\n");
    timestamped = 0;

    for (let i = 0; i < lyricInput.length; i++) {
        let cloneContent = lyricFrameTemplate.content;

        let lyricFrame = cloneContent.querySelector(".lyricFrame");
        let timestamp = lyricFrame.querySelector(".timestamp");
        let lyricText = lyricFrame.querySelector(".lyricText");
        lyricText.textContent = trim(lyricInput[i]);

        if (lyricInput[i] == "") {
            timestamp.textContent = "-";
            continue;
        }

        let match = /\[(\d+:\d{1,2}\.\d+)](?!\s*$)/g.exec(lyricInput[i]);
        if (match) {
            posInLyric++;

            let secs = time2sec(match[1]);

            lyricFrame.dataset.seconds = secs.toString();
            lyricFrame.dataset.lyricPos = posInLyric.toString();

            timestamp.textContent = match[1];
            lyricText.textContent = lyricInput[i].replace(/\[.*?]/, "");

            timestamped++;
        }

        let clone = cloneContent.cloneNode(true);
        lyricElements.push(clone.querySelector(".lyricFrame"));
        lyricDiv.appendChild(clone);
    }

    if (timestamped != 0 && timestamped < lyricElements.length) {
        if (!(await windowConfirm("Lines without timestamps will be removed from the editor. Proceed to the editor?"))) {
            lyricDiv.textContent = "";
            lyricElements = [];
            return;
        };
        Array.from(lyricElements).forEach((element, index) => {
            if (element.dataset.seconds) return;
            lyricElements.splice(index, 1);
            element.remove();
        })
    }

    Object.keys(data).forEach((key) => {
        data[key] = fileMetadata.elements[key].value;
    });

    let musicUrl = URL.createObjectURL(music.files[0]);
    audio.addEventListener("load", () => {
        URL.revokeObjectURL(musicUrl);
    });

    posInLyric = -1;
    isEditing = true;
    audio.src = musicUrl;
    info.style.display = "none";
    generate.style.display = "flex";

    document.querySelector("#description").innerHTML = "Clicking the timestamp in the line sets the timestamp to the current time of the music.<br>Clicking the lyric text will jump to that line in the music.";
}

function changeOffset(value) {
    offset += value;
    offsetInput.value = offset / 1000;
}
function applyOffset(allLines) {
    const offsetSeconds = offset / 1000;

    const updateElement = (element) => {
        if (!element || !element.dataset.seconds) return;

        const result = Math.max(0, Number(element.dataset.seconds) + offsetSeconds);
        element.dataset.seconds = result.toString();

        const timestampEl = element.querySelector(".timestamp");
        if (timestampEl) timestampEl.textContent = sec2time(result);
    };

    if (allLines) {
        lyricElements.forEach(updateElement);
    } else {
        updateElement(lyricElements[posInLyric]);
    }

    offset = 0;
    offsetInput.value = 0;
}
function goToLine(element) {
    if (!element) return;
    if (!element.dataset.lyricPos) return;
    if (lyricElements[posInLyric]) lyricElements[posInLyric].id = "";

    posInLyric = Number(element.dataset.lyricPos);
    audio.currentTime = Number(element.dataset.seconds);
}
function changeTime(element) {
    if (!element.dataset.lyricPos) return;
    if (Number(element.dataset.lyricPos) != posInLyric) return;
    let timestamp = element.getElementsByClassName("timestamp")[0];

    element.dataset.seconds = audio.currentTime.toString();

    timestamp.textContent = sec2time(audio.currentTime);
}
function nextLine() {
    posInLyric++;
    posInLyric = Math.min(posInLyric, lyricElements.length - 1);

    if (!isPlaying) return;
    if (posInLyric > lyricElements.length - 1) return;

    let prevElement = lyricElements[posInLyric - 1];
    let element = lyricElements[posInLyric];

    if (prevElement) prevElement.id = "";

    element.getElementsByClassName("timestamp")[0].textContent = sec2time(audio.currentTime);

    element.dataset.seconds = audio.currentTime.toString();
    element.dataset.lyricPos = posInLyric.toString();

    element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    element.id = "currentLyric";
}
async function clearTimes() {
    if (!(await windowConfirm("Are you sure you want to clear all lyric timestamps recorded?"))) return;
    lyricElements.forEach((element) => {
        delete element.dataset.lyricPos;
        delete element.dataset.seconds;
        element.getElementsByClassName("timestamp")[0].textContent = "00:00.00";
        element.id = "";
    });

    lyricElements[0].scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

    audio.pause();
    audio.currentTime = 0;
    posInLyric = -1;
}
async function finishFile() {
    const allTimestamped = Array.from(lyricElements).every((element) => {
        if (!element.dataset.seconds) {
            windowAlert("Record all timestamps first before downloading!");
            return false;
        }
        return true;
    });
    if (!allTimestamped) return;

    const applyHeaders = fileControls.elements["applyMeta"];
    const askSave = fileControls.elements["askSave"];

    let result = `[ar:${data.artist}]\n[al:${data.album}]\n[ti:${data.title}]\n[au:${data.author}]\n[length:${sec2time(audio.duration)}]\n[by:${data.by}]\n[re:mehusername's LRC File Editor]\n[ve:1.0.0]\n`;
    if (!applyHeaders.checked) result = "";
    lyricElements.forEach((element) => {
        let lyricText = element.getElementsByClassName("lyricText")[0].textContent;
        let timestamp = element.getElementsByClassName("timestamp")[0].textContent;
        result += `[${timestamp}]${lyricText}\n`;
    })

    if (askSave.checked) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: `${data.artist ? `${data.artist} - ` : ""}${data.title}`,
                types: [{
                    description: 'LRC File',
                    accept: {
                        'text/plain': ['.lrc'],
                    },
                }],
            });

            const writable = await handle.createWritable();
            await writable.write(result);
            await writable.close();

            errorMessage.textContent = "";
            return;
        } catch (err) {
            if (err.name === "AbortError") {
                errorMessage.textContent = `File save was aborted.`;
                return;
            }
            errorMessage.textContent = `showSaveFilePicker failed, falling back to anchor download: ${err.message}`;
        }
    }

    let lrcFile = new File([result], `${data.artist ? `${data.artist} - ` : ""}${data.title}.lrc`, {
        type: 'text/plain'
    });

    let link = document.createElement("a");
    let url = URL.createObjectURL(lrcFile);

    link.href = url;
    link.download = `${lrcFile.name}.lrc`;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
function previewLyric() {
    let prevElement = lyricElements[posInLyric];
    let element = lyricElements[posInLyric + 1];

    if (!element) return;
    if (!element.dataset.lyricPos) return;
    if (Number(element.dataset.seconds) > audio.currentTime) return;
    if (prevElement) prevElement.id = "";

    lyricDiv.scrollTo({
        top: element.offsetTop - lyricDiv.offsetTop - (lyricDiv.clientHeight / 2) + (element.clientHeight / 2),
        // left: element.offsetLeft - lyricDiv.offsetLeft - (lyricDiv.clientWidth / 2) + (element.clientWidth / 2),
        behavior: 'smooth'
    });
    element.id = "currentLyric";
    posInLyric++;
}

audio.onpause = () => {
    isPlaying = false;
    clearInterval(previewInterval);
}
audio.onplay = () => {
    isPlaying = true;
    previewInterval = setInterval(previewLyric);
}
audio.onseeked = () => {
    clearInterval(previewInterval);
    let tempPos = -1;
    posInLyric = -1;

    lyricElements.forEach((element) => element.id = "");
    for (let element, i = 0, n = lyricElements.length; i < n; i++) {
        if (element = lyricElements[posInLyric], !element) break;
        if (!element.dataset.lyricPos) break;
        if (Number(element.dataset.seconds) > audio.currentTime) break;

        tempPos++;
    }
    posInLyric = tempPos;
    previewInterval = setInterval(previewLyric);
}
music.onchange = () => {
    if (!music.files[0]) return;
    musicSelected.textContent = music.files[0].name;
}
lyricDiv.onclick = (e) => {
    const parentElement = e.target.parentElement;
    const target = e.target
    if (target.classList.contains("timestamp")) {
        changeTime(parentElement);
    } else if (target.classList.contains("lyricText")) {
        goToLine(parentElement);
    }
}
lrcInput.onchange = () => {
    if (!lrcInput.files[0]) return;
    if (lrcInput.files[0].type != "application/lrc") {
        const allowedExtensions = ['lrc', 'txt'];
        const file = lrcInput.files[0];
        const extension = file.name.split('.').pop().toLowerCase();

        if (!allowedExtensions.includes(extension)) {
            return windowAlert("That's not a LRC file dude.");
        }
        //fallback when nothing appears
    }
    let pattern = /\[ar:\s*(?<artist>.+?)]|\[al:\s*(?<album>.+?)]|\[ti:\s*(?<title>.+?)]|\[au:\s*(?<author>.+?)]|\[by:\s*(?<by>.+?)]/g;

    let fileReader = new FileReader();
    fileReader.readAsText(lrcInput.files[0]);

    fileReader.onloadend = () => {
        if (!fileReader.result) return;

        let matches = fileReader.result.matchAll(pattern);
        for (const match of matches) {
            Object.entries(match.groups).forEach(([key, value]) => {
                if (!value) return;
                document.getElementById(key).value = value ? value : "";
            });
        }

        lyrics.value = fileReader.result.replace(/\s*\[[a-zA-Z]*:.*?]\s*/g, "");
    }
}
window.onbeforeunload = (event) => {
    if (!isEditing) return;

    event.preventDefault();
    event.returnValue = true;
}

//theme set
window.onload = () => {
    let theme = localStorage.getItem("darkTheme") === "true";

    document.getElementById("themeButton").checked = theme;
    switchTheme(theme);
}
