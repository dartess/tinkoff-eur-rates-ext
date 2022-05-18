const updateRate = async () => {
    try {
        const response = await fetch('http://78.24.219.83:3000/last');
        const { price, date } = await response.json();
        chrome.action.setBadgeBackgroundColor({ color: 'black' });
        chrome.action.setBadgeText({ text: price.toString() });
        chrome.storage.local.set({ lastUpdate: date });

        if (price === -1) {
            return;
        }
        const { lastPrice, targetPrice } = await chrome.storage.local.get(['lastPrice', 'targetPrice']);
        if (targetPrice && price >= targetPrice && (!lastPrice || lastPrice < targetPrice)) {
            chrome.notifications.create({
                iconUrl: 'notice-price.png',
                title: 'Изменение цены за евро',
                message: `Новая цена: ${price}`,
                priority: 2,
                type: 'basic',
            });
        }
        chrome.storage.local.set({ lastPrice: price });
    } catch (e) {
        console.warn(e);
        chrome.action.setBadgeBackgroundColor({ color: 'red' });
        chrome.action.setBadgeText({ text: 'err' });
    }
};

const ALARM_UPDATE = 'ALARM_UPDATE';

chrome.runtime.onInstalled.addListener(async () => {
    await chrome.alarms.clear(ALARM_UPDATE)
    updateRate();
    chrome.alarms.create(ALARM_UPDATE, { periodInMinutes: 5 / 60 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_UPDATE) {
        updateRate();
    }
});