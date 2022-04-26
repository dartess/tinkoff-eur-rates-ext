const updateRate = () => {
  fetch('http://78.24.219.83:3000/last')
    .then(res => res.json())
    .then(data => {
      chrome.browserAction.setBadgeBackgroundColor({ color: 'black' });
      chrome.browserAction.setBadgeText({ text: data.price.toString() });
    })
    .catch(e => {
      chrome.browserAction.setBadgeBackgroundColor({ color: 'red' });
      chrome.browserAction.setBadgeText({ text: 'err' });
    })
};

window.onload = () => {
  updateRate();
  window.setInterval(updateRate, 5 * 1000);
};
