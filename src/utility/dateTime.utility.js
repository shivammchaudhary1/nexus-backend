function getTotalDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month - 1, 1).getDay();
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600); // 1 hour = 3600 seconds
  const remainingSeconds = seconds % 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const remainingSecondsInMinutes = remainingSeconds % 60;

  return { hours, minutes, seconds: remainingSecondsInMinutes };
}

function calculateHours(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return { hours, minutes };
}

module.exports = {
  calculateHours,
  getTotalDaysInMonth,
  getFirstDayOfMonth,
  formatDuration,
};
