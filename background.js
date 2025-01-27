const MTTH_HOURS = 1/60;
const ALARM_DURATION_MINUTES = 15;
const ALARM_NAME = "fireAlarmDrill";
const DRILL_PAGE_URL = "fire_alarm.html";
let fireDrillWindowId = null; // To track the fire drill window's ID
let checkWindowIntervalId = null; // To track the setInterval ID

function getRandomInterval() {
  const lambda = 1 / MTTH_HOURS;
  return -Math.log(1 - Math.random()) / lambda;
}

function scheduleNextAlarm() {
  const intervalHours = getRandomInterval();
  const intervalMilliseconds = intervalHours * 60 * 60 * 1000;

  // Calculate hours, minutes, and seconds
  const hours = Math.floor(intervalMilliseconds / (60 * 60 * 1000));
  const minutes = Math.floor((intervalMilliseconds % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((intervalMilliseconds % (60 * 1000)) / 1000);

  const when = Date.now() + intervalMilliseconds;
  chrome.alarms.create(ALARM_NAME, { when: when });

  // Format the output string
  const formattedInterval = `${hours} hours, ${minutes} minutes, ${seconds} seconds`;
  console.log(`Next fire drill scheduled in approximately ${formattedInterval}.`);
}

function triggerFireDrill() {
  console.log("Fire drill triggered!");

  // 1. Open Fullscreen Page
  chrome.windows.create({
    url: DRILL_PAGE_URL + "?startAlarm=true",
    state: "fullscreen",
    type: "popup"
  }, (window) => {
    fireDrillWindowId = window.id; // Store the window ID

    // Start window checking INTERVAL in BACKGROUND SCRIPT!
    checkWindowIntervalId = setInterval(() => {
      console.log("background.js setInterval: Checking if window is still open...");
      chrome.windows.get(fireDrillWindowId, function(window) {
        if (chrome.runtime.lastError || !window) { // Window is closed or error occurred!
          console.log("background.js setInterval: Fire drill window CLOSED! Re-opening...");
          clearInterval(checkWindowIntervalId); // Stop this interval
          checkWindowIntervalId = null;
          triggerFireDrill(); // Re-trigger the fire drill to re-open the window
        } else {
          console.log("background.js setInterval: Fire drill window is still OPEN.");
        }
      });
    }, 2000); // Check every 2 seconds

    setTimeout(() => {
      console.log("Fire drill ending. Clearing interval and window ID.");
      clearInterval(checkWindowIntervalId); // Stop the interval after 15 minutes
      checkWindowIntervalId = null;
      fireDrillWindowId = null; // Clear the window ID when drill ends
      chrome.alarms.clear(ALARM_NAME); // Clear the current alarm
      setTimeout(scheduleNextAlarm, 1000); // Schedule next alarm with 1-second delay
    }, ALARM_DURATION_MINUTES * 60 * 1000);
  });
}

chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === ALARM_NAME) {
    triggerFireDrill();
  }
});

scheduleNextAlarm();