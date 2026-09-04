const COOKIE_NAME = "cinema_enti_state";

let games = [];

let currentDate =
  new Date().toLocaleDateString("en-CA");

let mode = "easy";

let attempts = 0;

let current = null;


const descriptions = {

  easy:
    "Ee dialogue ekkuva mandi immediate ga kanipedataru 😎",

  hard:
    "Konchem brain use cheyyali ra babu 🧠",

  ultra_hard:
    "Idi real cinema pichollaki maatrame 🔥"

};


function $(id) {
  return document.getElementById(id);
}


/*
------------------------------------
COOKIE HELPERS
------------------------------------
*/

function getCookie(name) {

  const cookies =
    document.cookie.split("; ");

  const cookie =
    cookies.find(row =>
      row.startsWith(name + "=")
    );

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(
    cookie.split("=")[1]
  );
}


function setCookie(name, value, days = 365) {

  const expires =
    new Date(
      Date.now() +
      days * 24 * 60 * 60 * 1000
    ).toUTCString();

  document.cookie =
    `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}


function loadState() {

  try {

    const value =
      getCookie(COOKIE_NAME);

    if (!value) {
      return {};
    }

    return JSON.parse(value);

  } catch (error) {

    console.error(
      "Could not read cookie",
      error
    );

    return {};
  }
}


function saveState(state) {

  setCookie(
    COOKIE_NAME,
    JSON.stringify(state),
    365
  );

}


/*
------------------------------------
GUESS NORMALIZATION
------------------------------------
*/

function normalize(text) {

  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(
      /[“”"'`.,!?;:()[\]{}\-_/\\]/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

}


/*
------------------------------------
DAILY GAME NUMBER
------------------------------------
*/

function getGameNumber() {

  const start =
    new Date("2026-09-05");

  const today =
    new Date(currentDate);

  const diff =
    Math.floor(
      (today - start) /
      (1000 * 60 * 60 * 24)
    );

  return String(
    Math.max(1, diff + 1)
  ).padStart(3, "0");

}


/*
------------------------------------
SHARE RESULT
------------------------------------
*/

function getShareText() {

  const state =
    loadState();

  const todayState =
    state[currentDate] || {};

  const modes = [

    {
      key: "easy",
      emoji: "🟩",
      name: "Easy"
    },

    {
      key: "hard",
      emoji: "🟨",
      name: "Hard"
    },

    {
      key: "ultra_hard",
      emoji: "🟥",
      name: "Ultra"
    }

  ];

  let solved = 0;

  const lines =
    modes.map(gameMode => {

      const result =
        todayState[gameMode.key];

      if (
        result &&
        result.solved
      ) {

        solved++;

        return `${gameMode.emoji} ${gameMode.name} — ${result.attempts}️⃣`;

      }

      return `${gameMode.emoji} ${gameMode.name} — ❌`;

    });


  return `🎬 Cinema Enti? #${getGameNumber()}

${lines.join("\n\n")}

${solved}/3 🎬

Beat me ra 😏

cinema-enti.com`;

}


/*
------------------------------------
UPDATE SHARE SECTION
------------------------------------
*/

function updateShareSection() {

  const section =
    $("shareSection");

  const preview =
    $("sharePreview");

  if (!section || !preview) {
    return;
  }

  const state =
    loadState();

  const todayState =
    state[currentDate] || {};

  const allCompleted =
    !!(
      todayState.easy &&
      todayState.hard &&
      todayState.ultra_hard
    );


  if (allCompleted) {

    preview.textContent =
      getShareText();

    section.style.display =
      "block";

  } else {

    section.style.display =
      "none";

  }

}


/*
------------------------------------
INITIALIZE
------------------------------------
*/

async function init() {

  try {

    games =
      await fetch("data/games.json")
        .then(response => {

          if (!response.ok) {
            throw new Error(
              "games.json could not be loaded"
            );
          }

          return response.json();

        });


    $("date").textContent =
      currentDate;

    loadGame();

    updateShareSection();

  } catch (error) {

    console.error(
      "Could not load games",
      error
    );

    $("message").className =
      "fail";

    $("message").textContent =
      "Game load avvaledu ra 😭";

  }

}


/*
------------------------------------
LOAD GAME
------------------------------------
*/

function loadGame() {

  const day =
    games.find(
      game =>
        game.date === currentDate
    ) || games[0];


  if (!day || !day[mode]) {

    $("message").className =
      "fail";

    $("message").textContent =
      "Ee roju game dorakaledu ra 😭";

    return;
  }


  current =
    day[mode];

  attempts = 0;


  $("modeDesc").textContent =
    descriptions[mode];


  $("guess").value = "";

  $("message").textContent = "";

  $("message").className = "";

  $("guessBtn").disabled = false;

  $("guess").disabled = false;


  $("audio").src =
    current.audio;


  /*
  Reset play button.
  */

  $("playBtn").textContent =
    "▶";


  renderAttempts();

  renderClues();


  /*
  Check whether this mode
  was already completed.
  */

  const state =
    loadState();


  if (
    state[currentDate] &&
    state[currentDate][mode]
  ) {

    const result =
      state[currentDate][mode];


    attempts =
      result.attempts;


    renderAttempts();


    if (result.solved) {

      $("message").className =
        "success";

      $("message").textContent =
        `Already kanipettav ra 😎 — ${current.movie}`;

    } else {

      $("message").className =
        "fail";

      $("message").textContent =
        `Answer: ${current.movie}`;

    }


    $("guessBtn").disabled = true;

    $("guess").disabled = true;

  }


  updateShareSection();

}


/*
------------------------------------
ATTEMPTS
------------------------------------
*/

function renderAttempts() {

  $("attempts").innerHTML =
    Array.from(
      { length: 6 },
      (_, index) => {

        const used =
          index < attempts
            ? "used"
            : "";

        return `
          <span class="dot ${used}"></span>
        `;

      }
    ).join("");

}


/*
------------------------------------
CLUES
------------------------------------
*/

function renderClues() {

  const shown = [];


  if (attempts >= 2) {

    shown.push(
      `👤 Hero: ${current.clues.actor}`
    );

  }


  if (attempts >= 3) {

    shown.push(
      `📅 Year: ${current.clues.year}`
    );

  }


  if (attempts >= 4) {

    shown.push(
      `🎬 Director: ${current.clues.director}`
    );

  }


  $("clues").innerHTML =
    shown
      .map(
        clue =>
          `<div class="clue">${clue}</div>`
      )
      .join("");

}


/*
------------------------------------
GUESS
------------------------------------
*/

function guess() {

  if (!current) {
    return;
  }


  if (attempts >= 6) {
    return;
  }


  const value =
    normalize(
      $("guess").value
    );


  if (!value) {
    return;
  }


  attempts++;

  renderAttempts();


  const correct =
    current.answers.some(
      answer =>
        normalize(answer) === value
    );


  /*
  CORRECT
  */

  if (correct) {

    $("message").className =
      "success";

    $("message").textContent =
      `🔥 Super ra! ${current.movie} — ${attempts}/6`;


    const state =
      loadState();


    if (!state[currentDate]) {
      state[currentDate] = {};
    }


    state[currentDate][mode] = {

      solved: true,

      attempts: attempts,

      movie: current.movie

    };


    saveState(state);


    $("guessBtn").disabled = true;

    $("guess").disabled = true;


    updateShareSection();

    return;
  }


  /*
  FAILED ALL ATTEMPTS
  */

  if (attempts >= 6) {

    $("message").className =
      "fail";

    $("message").textContent =
      `Ayyo 😂 answer ${current.movie}`;


    const state =
      loadState();


    if (!state[currentDate]) {
      state[currentDate] = {};
    }


    state[currentDate][mode] = {

      solved: false,

      attempts: attempts,

      movie: current.movie

    };


    saveState(state);


    $("guessBtn").disabled = true;

    $("guess").disabled = true;


    updateShareSection();

    return;
  }


  /*
  WRONG GUESS
  */

  $("message").className =
    "fail";

  $("message").textContent =
    "Adi kaadu ra 😭 malli vinu...";


  renderClues();

}


/*
------------------------------------
MODE SWITCHING
------------------------------------
*/

document
  .querySelectorAll(".mode")
  .forEach(button => {

    button.onclick = () => {

      mode =
        button.dataset.mode;


      document
        .querySelectorAll(".mode")
        .forEach(btn =>
          btn.classList.toggle(
            "active",
            btn === button
          )
        );


      loadGame();

    };

  });


/*
------------------------------------
AUDIO
------------------------------------
*/

$("playBtn").onclick = () => {

  const audio =
    $("audio");


  if (audio.paused) {

    audio.play()
      .then(() => {

        $("playBtn").textContent =
          "⏸";

      })
      .catch(error => {

        console.error(
          "Audio playback failed",
          error
        );

      });

  } else {

    audio.pause();

    $("playBtn").textContent =
      "▶";

  }

};


$("audio").addEventListener(
  "play",
  () => {
    $("playBtn").textContent = "⏸";
  }
);


$("audio").addEventListener(
  "pause",
  () => {
    $("playBtn").textContent = "▶";
  }
);


/*
------------------------------------
GUESS BUTTON
------------------------------------
*/

$("guessBtn").onclick = () => {
  guess();
};


/*
------------------------------------
ENTER KEY
------------------------------------
*/

$("guess").addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {
      guess();
    }

  }
);


/*
------------------------------------
SHARE BUTTON
------------------------------------
*/

const shareBtn =
  $("shareBtn");


if (shareBtn) {

  shareBtn.onclick = async () => {

    const shareText =
      getShareText();


    /*
    Mobile / supported browsers
    */

    if (navigator.share) {

      try {

        await navigator.share({

          title:
            `Cinema Enti? #${getGameNumber()}`,

          text:
            shareText

        });

      } catch (error) {

        /*
        User cancelled sharing.
        */

        console.log(
          "Share cancelled"
        );

      }

      return;

    }


    /*
    Desktop fallback:
    copy result to clipboard.
    */

    try {

      await navigator.clipboard.writeText(
        shareText
      );


      shareBtn.textContent =
        "✅ COPIED!";


      setTimeout(() => {

        shareBtn.textContent =
          "📤 SHARE RESULT";

      }, 2000);


    } catch (error) {

      prompt(
        "Copy your result:",
        shareText
      );

    }

  };

}


/*
------------------------------------
START GAME
------------------------------------
*/

init();
