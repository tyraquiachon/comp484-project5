var LOCATIONS = [
  {
    // assigned location (campus map grid: c5)
    name: "Charles H. Noski Auditorium",
    bounds: {
      north: 34.24273,
      south: 34.24213,
      east:  -118.53040,
      west:  -118.53120
    }
  },
  {
    // bookstore (e3)
    name: "The Bookstore",
    bounds: {
      north: 34.23811,
      south: 34.23751,
      east:  -118.52477,
      west:  -118.52557
    }
  },
  {
    // bayramian (c3)
    name: "Bayramian Hall",
    bounds: {
      north: 34.24092,
      south: 34.24032,
      east:  -118.52922,
      west:  -118.53002
    }
  },
  {
    // jacaranda (e2)
    name: "Jacaranda Hall",
    bounds: {
      north: 34.24159,
      south: 34.24099,
      east:  -118.52676,
      west:  -118.52756
    }
  },
  {
    // manzanita (d2)
    name: "Manzanita Hall",
    bounds: {
      north: 34.23815,
      south: 34.23755,
      east:  -118.52931,
      west:  -118.53011
    }
  }
];

// game state
var map;
var currentQ       = 0;
var score          = 0;
var gameOver       = false;
var drawnRects     = [];
var timerInterval  = null;
var elapsedSeconds = 0;

// map — called by api

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center:            { lat: 34.2403, lng: -118.5283 },
    zoom:              17,
    disableDefaultUI:  true,
    gestureHandling:   "none",   // disables all pan/zoom gestures
    keyboardShortcuts: false,    // disables keyboard pan/zoom
    mapTypeId:         "roadmap"
  });

  map.addListener("dblclick", function (e) {
    if (gameOver) return;
    handleGuess(e.latLng);
  });

  showQuestion();
  startTimer();
}

// timer

function startTimer() {
  elapsedSeconds = 0;
  updateTimerDisplay();
  timerInterval = setInterval(function () {
    elapsedSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function updateTimerDisplay() {
  var m = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  var s = String(elapsedSeconds % 60).padStart(2, "0");
  $("#timer-display").text(m + ":" + s);
}

// proper time format
function formatTime(sec) {
  var m = Math.floor(sec / 60);
  var s = sec % 60;
  return (m > 0 ? m + "m " : "") + s + "s";
}

// updates prompt box and question counter for the current location
function showQuestion() {
  var loc = LOCATIONS[currentQ];
  $("#current-question").text("Where is " + loc.name + "?");
  $("#q-counter").text("Question " + (currentQ + 1) + " of " + LOCATIONS.length);
}

// handle guess
function handleGuess(latLng) {
  var loc = LOCATIONS[currentQ];

  // latlngbounds defines the rectangular hit area for the building
  var bounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(loc.bounds.south, loc.bounds.west),
    new google.maps.LatLng(loc.bounds.north, loc.bounds.east)
  );

  // true if the clicked point falls inside the bounds
  var isCorrect = bounds.contains(latLng);

  // rectangle — green = correct , red = wrong
  var rect = new google.maps.Rectangle({
    bounds:       bounds,
    map:          map,
    fillColor:    isCorrect ? "#00b894" : "#d63031",
    fillOpacity:  0.45,
    strokeColor:  isCorrect ? "#00b894" : "#d63031",
    strokeWeight: 2
  });
  drawnRects.push(rect); // saved to them on restart
  if (isCorrect) score++;

  addLogEntry(loc.name, isCorrect);
  triggerFlash(isCorrect);

  currentQ++;

  if (currentQ >= LOCATIONS.length) {
    endGame();
  } else {
    showQuestion();
  }
}

// log entry
function addLogEntry(name, correct) {
  var msg  = correct ? "✓ Your answer is correct!!" : "✗ Sorry wrong location.";
  var cls  = correct ? "correct" : "wrong";
  var html = '<div class="log-item ' + cls + '">' +
               '<div class="loc-name">' + name + '</div>' +
               msg +
             '</div>';
  $("#log").append(html);
}

// screen flash effect
function triggerFlash(correct) {
  var $f = $("#flash");
  $f.removeClass("correct-flash wrong-flash");
  $f[0].offsetWidth; //forces reflow css animation restarts even if readd
  $f.addClass(correct ? "correct-flash" : "wrong-flash");
}

// end game
function endGame() {
  gameOver = true;
  stopTimer();

  $("#prompt-box").hide();
  $("#q-counter").hide();

  var wrong = LOCATIONS.length - score;
  $("#score-big").text(score + " Correct, " + wrong + " Incorrect");
  $("#score-sub").text("out of " + LOCATIONS.length + " locations");
  $("#time-final").text("Completed in " + formatTime(elapsedSeconds));
  $("#score-card").show();

  // save result and refresh
  saveHighScore(score, elapsedSeconds);
  renderHighScores();
}

// high score
function saveHighScore(s, t) {
  var hs = getHighScores();
  hs.push({ score: s, time: t, date: new Date().toLocaleDateString() });

  // sort: more correct answers first / by time
  hs.sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return a.time - b.time;
  });

  hs = hs.slice(0, 5); // keep only top 5
  localStorage.setItem("csunQuizHS", JSON.stringify(hs));

  if (hs.length > 0) {
    $("#hs-display").text(hs[0].score + "/5 in " + formatTime(hs[0].time));
  }
}

function getHighScores() {
  try {
    return JSON.parse(localStorage.getItem("csunQuizHS")) || [];
  } catch (e) {
    return []; //returns empty array if localstorage data is corrupted
  }
}

function renderHighScores() {
  var hs  = getHighScores();
  var $ul = $("#hs-list");
  $ul.empty();

  if (hs.length === 0) {
    $ul.append('<div class="hs-entry" style="color:var(--muted);font-size:0.75rem;">No scores yet</div>');
    return;
  }

  $.each(hs, function (i, entry) {
    $ul.append(
      '<div class="hs-entry">' +
        '<span>#' + (i + 1) + ' ' + entry.date + '</span>' +
        '<span class="hs-score">' + entry.score + '/5 · ' + formatTime(entry.time) + '</span>' +
      '</div>'
    );
  });

  $("#hs-display").text(hs[0].score + "/5 in " + formatTime(hs[0].time));
}

// document ready
$(document).ready(function () {

  renderHighScores();

  $("#restart-btn").on("click", function () {
    $.each(drawnRects, function (i, r) { r.setMap(null); }); // removes rectangles from map
    drawnRects = [];

    currentQ  = 0;
    score     = 0;
    gameOver  = false;

    $("#log").empty();
    $("#score-card").hide();
    $("#prompt-box").show();
    $("#q-counter").show();

    showQuestion();
    startTimer();
  });

});