const COOKIE_NAME = "cinema_enti_state";

let games = [];
let movies = [];

let currentDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata"
}).format(new Date());

let mode = "easy";
let attempts = 0;
let current = null;

let selectedMovie = null;


/*
------------------------------------
DESCRIPTIONS
------------------------------------
*/

const descriptions = {
  easy:
    "Ee dialogue ekkuva mandi immediate ga kanipedataru 😎",

  hard:
    "Konchem brain use cheyyali ra babu 🧠",

  ultra_hard:
    "Idi real cinema pichollaki maatrame 🔥"
};


/*
------------------------------------
HELPER
------------------------------------
*/

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
MOVIE NORMALIZATION
------------------------------------
*/

function normalizeMovie(text) {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}


/*
------------------------------------
LEVENSHTEIN DISTANCE
------------------------------------

Used only for autocomplete ranking.

It does NOT affect whether an answer
is considered correct.
------------------------------------
*/

function levenshteinDistance(a, b) {

  const matrix =
    Array.from(
      { length: b.length + 1 },
      () =>
        Array(
          a.length + 1
        ).fill(0)
    );


  for (
    let i = 0;
    i <= b.length;
    i++
  ) {
    matrix[i][0] = i;
  }


  for (
    let j = 0;
    j <= a.length;
    j++
  ) {
    matrix[0][j] = j;
  }


  for (
    let i = 1;
    i <= b.length;
    i++
  ) {

    for (
      let j = 1;
      j <= a.length;
      j++
    ) {

      if (
        b[i - 1] ===
        a[j - 1]
      ) {

        matrix[i][j] =
          matrix[i - 1][j - 1];

      } else {

        matrix[i][j] =
          Math.min(

            matrix[i - 1][j] + 1,

            matrix[i][j - 1] + 1,

            matrix[i - 1][j - 1] + 1
          );
      }
    }
  }


  return matrix[b.length][a.length];
}


/*
------------------------------------
MOVIE SEARCH SCORE
------------------------------------

Higher score = better suggestion.

Priority:

1. Exact match
2. Starts with query
3. Contains query
4. Fuzzy word match
5. Fuzzy title-prefix match
------------------------------------
*/

function getMovieSearchScore(
  movie,
  query
) {

  const title =
    normalizeMovie(movie);

  const search =
    normalizeMovie(query);


  /*
  Exact match
  */

  if (title === search) {
    return 1000;
  }


  /*
  Title starts with query
  */

  if (title.startsWith(search)) {
    return 900;
  }


  /*
  Query appears anywhere
  */

  if (title.includes(search)) {
    return 800;
  }


  /*
  --------------------------------
  FUZZY MATCHING
  --------------------------------

  Compare the search text against
  individual words in the movie title.

  Example:

  "attarintiki"

  vs

  "atharintiki"

  Distance = 1
  */

  const words =
    title.split(/\s+/);

  let bestWordDistance =
    Infinity;


  for (const word of words) {

    const distance =
      levenshteinDistance(
        search,
        word
      );

    bestWordDistance =
      Math.min(
        bestWordDistance,
        distance
      );
  }


  /*
  --------------------------------
  TITLE PREFIX MATCH
  --------------------------------

  Useful for titles such as:

  "Atharintiki Daaredi"

  when user types:

  "attarintiki"
  */

  const titlePrefix =
    title.substring(
      0,
      Math.min(
        title.length,
        search.length + 3
      )
    );


  const prefixDistance =
    levenshteinDistance(
      search,
      titlePrefix
    );


  bestWordDistance =
    Math.min(
      bestWordDistance,
      prefixDistance
    );


  /*
  --------------------------------
  DISTANCE THRESHOLDS
  --------------------------------
  */

  if (bestWordDistance <= 2) {

    return (
      700 -
      bestWordDistance * 20
    );
  }


  if (bestWordDistance <= 3) {

    return (
      600 -
      bestWordDistance * 20
    );
  }


  if (bestWordDistance <= 4) {

    return (
      500 -
      bestWordDistance * 20
    );
  }


  return 0;
}


/*
------------------------------------
SEARCH MOVIES
------------------------------------
*/

function searchMovies(query) {

  const search =
    normalizeMovie(query);


  /*
  Don't search for extremely short
  queries because fuzzy matching can
  produce noisy results.
  */

  if (
    !search ||
    search.length < 2
  ) {
    return [];
  }


  return movies

    .map(movie => ({

      movie,

      score:
        getMovieSearchScore(
          movie,
          search
        )

    }))

    .filter(result =>
      result.score > 0
    )

    .sort((a, b) => {

      /*
      Higher score first.
      */

      if (
        b.score !== a.score
      ) {

        return (
          b.score -
          a.score
        );
      }


      /*
      Alphabetical tie-breaker.
      */

      return a.movie.localeCompare(
        b.movie
      );
    })

    .slice(0, 8)

    .map(result =>
      result.movie
    );
}


/*
------------------------------------
MOVIE AUTOCOMPLETE
------------------------------------
*/

function setupMovieAutocomplete() {

  const input =
    $("guess");


  if (!input) {

    console.error(
      "Guess input not found"
    );

    return;
  }


  /*
  ------------------------------------
  CREATE AUTOCOMPLETE CONTAINER
  ------------------------------------
  */

  let dropdown =
    $("movieAutocomplete");


  if (!dropdown) {

    dropdown =
      document.createElement(
        "div"
      );

    dropdown.id =
      "movieAutocomplete";


    /*
    CSS handles positioning,
    colors and appearance.
    */

    const parent =
      input.parentElement;


    if (!parent) {

      console.error(
        "Guess input parent not found"
      );

      return;
    }


    /*
    Make sure the parent can contain
    an absolutely positioned dropdown.
    */

    if (
      getComputedStyle(parent).position ===
      "static"
    ) {

      parent.style.position =
        "relative";
    }


    parent.appendChild(
      dropdown
    );
  }


  /*
  Prevent browser autocomplete
  from competing with our dropdown.
  */

  input.setAttribute(
    "autocomplete",
    "off"
  );


  /*
  ------------------------------------
  INPUT EVENT
  ------------------------------------
  */

  input.addEventListener(
    "input",
    () => {

      /*
      Any typing invalidates the previous
      dropdown selection.

      The user must select a new movie.
      */

      selectedMovie = null;


      const query =
        normalizeMovie(
          input.value
        );


      if (!query) {

        hideMovieAutocomplete();

        return;
      }


      const results =
        searchMovies(query);


      renderMovieSuggestions(
        results
      );
    }
  );


  /*
  ------------------------------------
  FOCUS
  ------------------------------------
  */

  input.addEventListener(
    "focus",
    () => {

      const query =
        normalizeMovie(
          input.value
        );


      if (!query) {
        return;
      }


      const results =
        searchMovies(query);


      renderMovieSuggestions(
        results
      );
    }
  );


  /*
  ------------------------------------
  BLUR
  ------------------------------------
  */

  input.addEventListener(
    "blur",
    () => {

      /*
      Small delay allows a mousedown
      on a suggestion to register
      before the dropdown disappears.
      */

      setTimeout(() => {

        hideMovieAutocomplete();

      }, 150);
    }
  );
}


/*
------------------------------------
RENDER MOVIE SUGGESTIONS
------------------------------------
*/

function renderMovieSuggestions(
  results
) {

  const dropdown =
    $("movieAutocomplete");


  if (!dropdown) {
    return;
  }


  dropdown.innerHTML = "";


  if (!results.length) {

    hideMovieAutocomplete();

    return;
  }


  results.forEach(movie => {

    const item =
      document.createElement(
        "div"
      );


    /*
    Exact canonical title from
    movies.json.
    */

    item.textContent =
      movie;


    /*
    --------------------------------
    SELECT MOVIE
    --------------------------------
    */

    item.addEventListener(
      "mousedown",
      event => {

        /*
        Prevent input blur from happening
        before the selection is registered.
        */

        event.preventDefault();

        selectMovie(movie);
      }
    );


    dropdown.appendChild(
      item
    );
  });


  dropdown.style.display =
    "block";
}


/*
------------------------------------
SELECT MOVIE
------------------------------------
*/

function selectMovie(movie) {

  const input =
    $("guess");


  if (!input) {
    return;
  }


  /*
  Put the exact canonical movie title
  from movies.json into the input.

  Example:

  User types:
  "attarintiki"

  Selected value becomes:
  "Atharintiki Daaredi"
  */

  input.value =
    movie;


  /*
  Store the exact canonical title.
  */

  selectedMovie =
    movie;


  hideMovieAutocomplete();


  /*
  Keep focus on input.
  */

  input.focus();
}


/*
------------------------------------
HIDE AUTOCOMPLETE
------------------------------------
*/

function hideMovieAutocomplete() {

  const dropdown =
    $("movieAutocomplete");


  if (!dropdown) {
    return;
  }


  dropdown.style.display =
    "none";
}


/*
------------------------------------
DAILY GAME NUMBER
------------------------------------
*/

function getGameNumber() {

  const start =
    new Date(
      "2026-09-05T00:00:00+05:30"
    );


  const today =
    new Date(
      `${currentDate}T00:00:00+05:30`
    );


  const diff =
    Math.floor(
      (today - start) /
      (1000 * 60 * 60 * 24)
    );


  return String(
    Math.max(
      1,
      diff + 1
    )
  ).padStart(
    3,
    "0"
  );
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
    modes.map(
      gameMode => {

        const result =
          todayState[
            gameMode.key
          ];


        if (
          result &&
          result.solved
        ) {

          solved++;


          return (
            `${gameMode.emoji} ${gameMode.name} — ${result.attempts}️⃣`
          );
        }


        return (
          `${gameMode.emoji} ${gameMode.name} — ❌`
        );
      }
    );


  return `🎬 Cinema Enti? #${getGameNumber()}

${lines.join("\n\n")}

${solved}/3 🎬

Beat me ra 😏

https://cinema-enti.vercel.app/`;
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


  if (
    !section ||
    !preview
  ) {
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

    /*
    Load games.json and movies.json
    at the same time.
    */

    [games, movies] =
      await Promise.all([

        fetch(
          "data/games.json"
        )
          .then(response => {

            if (!response.ok) {

              throw new Error(
                "games.json could not be loaded"
              );
            }

            return response.json();
          }),


        fetch(
          "data/movies.json"
        )
          .then(response => {

            if (!response.ok) {

              throw new Error(
                "movies.json could not be loaded"
              );
            }

            return response.json();
          })

      ]);


    /*
    --------------------------------
    VALIDATE MOVIE DATABASE
    --------------------------------
    */

    if (
      !Array.isArray(movies)
    ) {

      throw new Error(
        "movies.json must contain an array"
      );
    }


    /*
    --------------------------------
    SETUP AUTOCOMPLETE
    --------------------------------
    */

    setupMovieAutocomplete();


    /*
    --------------------------------
    DISPLAY DATE
    --------------------------------
    */

    $("date").textContent =
      currentDate;


    /*
    --------------------------------
    LOAD TODAY'S GAME
    --------------------------------
    */

    loadGame();


    /*
    --------------------------------
    UPDATE SHARE SECTION
    --------------------------------
    */

    updateShareSection();

  } catch (error) {

    console.error(
      "Could not load game data",
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
        game.date ===
        currentDate
    ) || games[0];


  if (
    !day ||
    !day[mode]
  ) {

    $("message").className =
      "fail";


    $("message").textContent =
      "Ee roju game dorakaledu ra 😭";


    return;
  }


  current =
    day[mode];


  attempts = 0;

  selectedMovie = null;


  /*
  --------------------------------
  UPDATE MODE DESCRIPTION
  --------------------------------
  */

  $("modeDesc").textContent =
    descriptions[mode];


  /*
  --------------------------------
  RESET INPUT
  --------------------------------
  */

  $("guess").value = "";


  hideMovieAutocomplete();


  /*
  --------------------------------
  RESET MESSAGE
  --------------------------------
  */

  $("message").textContent = "";

  $("message").className = "";


  /*
  --------------------------------
  ENABLE INPUT / BUTTON
  --------------------------------
  */

  $("guessBtn").disabled =
    false;

  $("guess").disabled =
    false;


  /*
  --------------------------------
  AUDIO
  --------------------------------
  */

  $("audio").src =
    current.audio;


  /*
  Reset play button.
  */

  $("playBtn").textContent =
    "▶";


  /*
  --------------------------------
  ATTEMPTS / CLUES
  --------------------------------
  */

  renderAttempts();

  renderClues();


  /*
  --------------------------------
  CHECK PREVIOUS STATE
  --------------------------------
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


    /*
    --------------------------------
    ALREADY SOLVED
    --------------------------------
    */

    if (result.solved) {

      $("message").className =
        "success";


      $("message").textContent =
        `Already kanipettav ra 😎 — ${current.movie}`;

    } else {

      /*
      --------------------------------
      ALREADY FAILED
      --------------------------------
      */

      $("message").className =
        "fail";


      $("message").textContent =
        `Answer: ${current.movie}`;
    }


    $("guessBtn").disabled =
      true;


    $("guess").disabled =
      true;
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
      {
        length: 6
      },
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


  /*
  Hero after 2 attempts.
  */

  if (
    attempts >= 2
  ) {

    shown.push(
      `👤 Hero: ${current.clues.actor}`
    );
  }


  /*
  Year after 3 attempts.
  */

  if (
    attempts >= 3
  ) {

    shown.push(
      `📅 Year: ${current.clues.year}`
    );
  }


  /*
  Director after 4 attempts.
  */

  if (
    attempts >= 4
  ) {

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


  if (
    attempts >= 6
  ) {
    return;
  }


  /*
  --------------------------------
  REQUIRE DROPDOWN SELECTION
  --------------------------------

  Arbitrary typed text is not accepted.
  */

  if (!selectedMovie) {

    $("message").className =
      "fail";


    $("message").textContent =
      "Dropdown nunchi movie select cheyyi ra 😭";


    return;
  }


  /*
  Increment attempt.
  */

  attempts++;


  renderAttempts();


  /*
  --------------------------------
  EXACT ANSWER VALIDATION
  --------------------------------

  selectedMovie comes directly from
  movies.json.

  current.movie comes from games.json.

  Therefore both must contain the
  exact same canonical movie title.

  Example:

  movies.json:
  "Atharintiki Daaredi"

  games.json:
  "Atharintiki Daaredi"

  => CORRECT

  Fuzzy matching is NOT used here.
  */

  const correct =
    selectedMovie ===
    current.movie;


  /*
  ------------------------------------
  CORRECT
  ------------------------------------
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


    $("guessBtn").disabled =
      true;


    $("guess").disabled =
      true;


    hideMovieAutocomplete();


    updateShareSection();


    return;
  }


  /*
  ------------------------------------
  FAILED ALL ATTEMPTS
  ------------------------------------
  */

  if (
    attempts >= 6
  ) {

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


    $("guessBtn").disabled =
      true;


    $("guess").disabled =
      true;


    hideMovieAutocomplete();


    updateShareSection();


    return;
  }


  /*
  ------------------------------------
  WRONG GUESS
  ------------------------------------
  */

  $("message").className =
    "fail";


  $("message").textContent =
    "Adi kaadu ra 😭 malli vinu...";


  /*
  Clear previous selection.

  User has to choose another movie
  from the dropdown.
  */

  selectedMovie = null;

  $("guess").value = "";


  hideMovieAutocomplete();


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

    audio
      .play()
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

    $("playBtn").textContent =
      "⏸";
  }
);


$("audio").addEventListener(
  "pause",
  () => {

    $("playBtn").textContent =
      "▶";
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

    if (
      event.key === "Enter"
    ) {

      event.preventDefault();

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

  shareBtn.onclick =
    async () => {

      const shareText =
        getShareText();


      /*
      --------------------------------
      MOBILE / SUPPORTED BROWSERS
      --------------------------------
      */

      if (
        navigator.share
      ) {

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
      --------------------------------
      DESKTOP FALLBACK
      --------------------------------
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