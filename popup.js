const makeChart = async (type) => {
    const response = await fetch(`http://78.24.219.83:3000/${type}`);
    const rates = (await response.json()).reverse();

    rates.forEach((item, index, items) => {
        if (item.price === -1) {
            item.price = items[index - 1]?.price ?? -1;
        }
    });

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

    const config = {
        type: 'line',
        data: data,
    };

    const ctx = document.getElementById('myChart').getContext('2d');

    return new Chart(ctx, config);
}

window.addEventListener('load', async () => {
    const {
        type = 'day',
        lastUpdate,
        targetPrice,
    } = await chrome.storage.local.get(['type', 'lastUpdate', 'targetPrice']);

    let chart = await makeChart(type);

    const select = document.getElementById('period');
    select.value = type;
    select.disabled = false;
    select.addEventListener('change', async (event) => {
        const newType = event.target.value;
        chrome.storage.local.set({ type: newType });
        chart.destroy();
        chart = await makeChart(newType);
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
})
