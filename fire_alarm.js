document.addEventListener('DOMContentLoaded', function() {
  const audio = document.getElementById('fireAlarmSound');
  const params = new URLSearchParams(window.location.search);
  let drillActive = true;

  if (params.get('startAlarm') === 'true') {
    const playSoundWithGap = () => {
      audio.play().catch(error => {
        console.error("Error playing audio:", error);
        // Handle potential autoplay errors
      });
    };

    playSoundWithGap(); // Start playing initially

    // Event listener for when the audio finishes playing
    audio.addEventListener('ended', function() {
      // Wait for 5 seconds before playing again
      setTimeout(playSoundWithGap, 5000); // 5000 milliseconds = 5 seconds
    });


    // Make window "uncloseable" and with custom message
    window.addEventListener('beforeunload', function (e) {
      if (drillActive) {
        e.preventDefault();
        const message = "FIRE DRILL IN PROGRESS! YOU MUST EVACUATE IMMEDIATELY!\n\nClosing this window is against protocol. Are you sure you want to abandon the fire drill?";
        e.returnValue = message;
        return message;
      }
    });


    setTimeout(() => {
      drillActive = false; // Drill is no longer active after 15 minutes
      audio.pause();
      audio.currentTime = 0;
      window.close(); // ADD window.close() HERE to close automatically after 15 minutes
      alert("FIRE DRILL OVER. You may now return to your work area."); // Optional: Alert when drill ends
    }, 15 * 60 * 1000);
  }
});