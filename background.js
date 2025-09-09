// FOR PRODUCTION: Set the mean time to happen to 1 week (168 hours).
const MTTH_HOURS = 168;
// FOR PRODUCTION: Set the drill duration to 15 minutes.
const ALARM_DURATION_MINUTES = 15;

const ALARM_NAME = "fireAlarmDrill";
const DRILL_PAGE_URL = "fire_alarm.html";
const TEMP_ALARM_NAME = "notificationTimeout";

// Keep track of the drill window and the timeout
let drillWindowId = null;
let rescheduleTimeoutId = null;

function getRandomInterval() {
  const lambda = 1 / MTTH_HOURS;
  return -Math.log(1 - Math.random()) / lambda;
}

function scheduleNextAlarm() {
  // Clear any existing trackers before scheduling
  drillWindowId = null;
  if (rescheduleTimeoutId) {
    clearTimeout(rescheduleTimeoutId);
    rescheduleTimeoutId = null;
  }

  const intervalHours = getRandomInterval();
  const intervalMilliseconds = intervalHours * 60 * 60 * 1000;
  const when = Date.now() + intervalMilliseconds;
  chrome.alarms.create(ALARM_NAME, { when: when });

  const hours = Math.floor(intervalHours);
  const minutes = Math.floor((intervalHours * 60) % 60);
  console.log(`Next fire drill scheduled in approximately ${hours} hours and ${minutes} minutes.`);
}

function startFireDrill() {
  console.log("Fire drill started by user consent.");
  chrome.windows.create({
    url: DRILL_PAGE_URL + "?startAlarm=true",
    type: "popup"
  }, (window) => {
    drillWindowId = window.id; // Store the window ID
    // Update to fullscreen after creation for better reliability
    chrome.windows.update(window.id, { state: "fullscreen" });
  });
  
  // This will run if the drill completes normally without being closed manually
  rescheduleTimeoutId = setTimeout(scheduleNextAlarm, ALARM_DURATION_MINUTES * 60 * 1000);
}

function askUserToStartDrill() {
  console.log("Fire drill time! Asking user for permission via notification.");
  chrome.notifications.create('fireDrillPrompt', {
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'Fire Drill',
      message: 'It is fire drill time!',
      buttons: [
          { title: 'Yes, dear' },
          { title: 'Not right now, please' }
      ],
      requireInteraction: true
  });
  
  // Set a temporary alarm for 60 seconds in the future.
  // If the user doesn't respond, this alarm will trigger.
  chrome.alarms.create(TEMP_ALARM_NAME, { delayInMinutes: 1 });
}

chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === ALARM_NAME) {
    askUserToStartDrill();
  } else if (alarm.name === TEMP_ALARM_NAME) {
    // If this alarm fires, it means the user ignored the notification.
    console.log("User ignored the notification. Rescheduling.");
    scheduleNextAlarm();
    // Clear the notification so it doesn't linger.
    chrome.notifications.clear('fireDrillPrompt');
  }
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationId === 'fireDrillPrompt') {
        // The user responded, so we can clear the temporary timeout alarm.
        chrome.alarms.clear(TEMP_ALARM_NAME);
        
        if (buttonIndex === 0) { // User clicked "yes, dear"
            startFireDrill();
        } else { // User clicked "not right now please"
            console.log("User postponed the fire drill. Rescheduling.");
            scheduleNextAlarm();
        }
        chrome.notifications.clear('fireDrillPrompt');
    }
});

// Listen for when a window is closed
chrome.windows.onRemoved.addListener((windowId) => {
  // Check if the window that was closed is our drill window
  if (windowId === drillWindowId) {
    console.log('Drill window closed manually. Rescheduling next drill now.');
    // Cancel the timer that was waiting for the full duration
    clearTimeout(rescheduleTimeoutId);
    // Schedule the next drill immediately
    scheduleNextAlarm();
  }
});

// On first install, trigger a drill prompt in 5 seconds.
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === "install") {
        console.log("First install detected. Prompting for a drill in 5 seconds.");
        setTimeout(askUserToStartDrill, 5000);
    }
});

// Schedule the very first alarm when the extension is installed/started.
scheduleNextAlarm();