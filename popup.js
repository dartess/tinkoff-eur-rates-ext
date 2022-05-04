const makeChart = async (type) => {
    const response = await fetch(`http://78.24.219.83:3000/${type}`);
    const rates = (await response.json()).reverse();

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
    const type = (await chrome.storage.local.get(['type']))?.type ?? 'day';

    let chart = await makeChart(type);

    const select = document.getElementById('period');
    select.value = type;
    select.disabled = false;
    select.addEventListener('change',  async (event) => {
        const newType = event.target.value;
        chrome.storage.local.set({ type: newType });
        chart.destroy();
        chart = await makeChart(newType);
    })
})
