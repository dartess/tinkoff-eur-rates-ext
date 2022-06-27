// @ts-check

function getDataAsIs(rates, type) {
    const labels = type === 'day'
        ? rates.map(item => new Date(item.date).toLocaleTimeString().slice(0, 5))
        : rates.map(item => new Date(item.date).toLocaleString().slice(0, 17))

    const data = {
        labels,
        datasets: [{
            label: 'евро',
            data: rates.map(item => item.price),
        }]
    };

    return data;
}

function getDataAggregated(rates) {
    let noTrade = false;
    let skipFirstTrade = false;
    const ratesWithoutNoTradePrices = rates.filter((rate, index) => {
        if (!rates[index + 1]) {
            return false;
        }
        if (rate.price === rates[index + 1].price) {
            noTrade = true;
            return false;
        }
        if (noTrade) {
            noTrade = false;
            skipFirstTrade = true;
            return false;
        }
        if (skipFirstTrade) {
            skipFirstTrade = false;
            return false;
        }
        return true;
    });

    let groupedByDate = groupByDate(ratesWithoutNoTradePrices, 'date');

    let date = ratesWithoutNoTradePrices[0].date;
    const dateNow = Date.now();
    const newRates = [];
    while (date < dateNow) {
        const dateObject = new Date(date);
        const dateStartDay = dateObject.setHours(0, 0, 0, 0);
        const { price, backgroundColor, label } = (() => {
            const label = new Date(dateObject).toISOString().slice(0, 10);
            if (groupedByDate[dateStartDay]) {
                const sum = groupedByDate[dateStartDay].map(i => i.price).reduce((acc, item) => (acc + item), 0);
                return {
                    price: (sum / groupedByDate[dateStartDay].length).toFixed(2),
                    backgroundColor: 'blue',
                    label,
                };
            }
            return {
                price: newRates[newRates.length - 1].price,
                backgroundColor: '#d3d3d3',
                label: `${label} (вых.)`
            };
        })()
        newRates.push({ date: dateStartDay, price, backgroundColor, label });

        date += 1000 * 60 * 60 * 24;
    }

    const data = {
        labels: newRates.map(item => item.label),
        datasets: [{
            label: 'евро',
            data: newRates.map(item => item.price),
            backgroundColor: newRates.map(item => item.backgroundColor),
        }]
    };

    return data;
}

function getData(rates, type, aggregate) {
    switch (type) {
        case 'day':
        case 'week': {
            return getDataAsIs(rates, type);
        }

        case 'month':
        case 'all': {
            return aggregate
                ? getDataAggregated(rates)
                : getDataAsIs(rates, type);
        }
    }
}

/**
 * @typedef {Object} Rate
 * @property {number} date
 * @property {number} price
 */

/**
 * @param {'day' | 'week' | 'month' | 'all'} type
 * @param {boolean} aggregate
 */
const makeChart = async (type, aggregate) => {
    const response = await fetch(`http://78.24.219.83:3000/${type}`);
    /** @type {Rate[]} */
    const rates = (await response.json()).reverse();

    rates.forEach((item, index, items) => {
        if (item.price === -1) {
            item.price = items[index - 1]?.price ?? -1;
        }
    });

    const ctx = document.getElementById('myChart').getContext('2d');

    return new Chart(ctx, {
        type: 'line',
        data: getData(rates, type, aggregate),
    });
}

window.addEventListener('load', async () => {
    const {
        type = 'day',
        lastUpdate,
        targetPrice,
        aggregate = true
    } = await chrome.storage.local.get(['type', 'lastUpdate', 'targetPrice', 'aggregate']);

    remakeChart();

    const select = document.getElementById('period');
    select.value = type;
    select.disabled = false;
    select.addEventListener('change', async (event) => {
        const newType = event.target.value;
        chrome.storage.local.set({ type: newType });
        remakeChart();
    })

    const lastUpdateSpan = document.getElementById('lastUpdate');
    lastUpdateSpan.textContent = lastUpdate
        ? new Date(lastUpdate).toLocaleString()
        : '-';

    const targetPriceInput = document.getElementById('targetPrice');
    targetPriceInput.value = targetPrice ?? '';
    targetPriceInput.oninput = ({ target: { value }}) => {
        const newTargetPrice = parseFloat(value.replace(',', '.'));
        if (Number.isFinite(newTargetPrice)) {
            chrome.storage.local.set({ targetPrice: newTargetPrice });
        } else {
            chrome.storage.local.remove('targetPrice');
        }
    }

    const refreshButton = document.getElementById('refresh');
    refreshButton.addEventListener('click', async () => {
        try {
            const response = await fetch(`http://78.24.219.83:3000/refresh`, { method: 'POST' });
            const rate = await response.json();
            lastUpdateSpan.textContent = new Date(rate.date).toLocaleString();
            chrome.action.setBadgeText({ text: rate.price.toString() });
        } catch {
            alert('Что-то пошло не так');
        }
    })

    const aggregateCheckbox = document.getElementById('aggregate');
    aggregateCheckbox.checked = aggregate;
    aggregateCheckbox?.addEventListener('change', async (event) => {
        chrome.storage.local.set({ aggregate: event.target.checked });
        remakeChart();
    })
});

let chart;
async function remakeChart() {
    const { type = 'day', aggregate = true } = await chrome.storage.local.get(['type', 'lastUpdate', 'targetPrice', 'aggregate']);
    chart?.destroy();
    chart = await makeChart(type, aggregate);
}

function groupByDate(
    items,
    timestampField,
) {
    const itemsByDate = Object.create(null);
    items.forEach((item) => {
        const timestamp = item[timestampField];
        const date = (new Date(timestamp)).setHours(0, 0, 0, 0);
        if (!(date in itemsByDate)) {
            itemsByDate[date] = [];
        }
        itemsByDate[date].push(item);
    });
    return itemsByDate;
}
