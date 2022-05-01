const updateRate = () => {
  fetch('http://78.24.219.83:3000/last')
    .then(res => res.json())
    .then(data => {
      chrome.action.setBadgeBackgroundColor({ color: 'black' });
      chrome.action.setBadgeText({ text: data.price.toString() });
    })
    .catch(e => {
      chrome.action.setBadgeBackgroundColor({ color: 'red' });
      chrome.action.setBadgeText({ text: 'err' });
    })
};

chrome.runtime.onInstalled.addListener(() => {
    updateRate();
    chrome.alarms.create({ delayInMinutes: 1 });
    chrome.alarms.onAlarm.addListener(updateRate);
});
