// kikis estrogen delivery service - complete working version

const esters = [
    { name: "estradiol benzoate", ka: 14.4, ke: 0.577, f: 0.8, content: 72.5, color: "#ff6b6b" },
    { name: "estradiol valerate", ka: 3.32, ke: 0.196, f: 0.85, content: 76.2, color: "#4fc3f7" },
    { name: "estradiol cypionate", ka: 1.66, ke: 0.103, f: 0.9, content: 67.6, color: "#81c784" },
    { name: "estradiol enanthate", ka: 1.5050, ke: 0.12445, f: 0.48, content: 70.0, color: "#ffb74d", vd: 5087 },
    { name: "estradiol undecylate", ka: 0.500, ke: 0.029, f: 0.10, content: 61.7, color: "#ba68c8", vd: 15000 },
    { name: "polyestradiol phosphate", ka: 0.31, ke: 0.0244, f: 0.8, content: 81.3, color: "#f06292" }
];

let doses = [];
let doseIdCounter = 1;
let chart = null;
let currentViewLevel = 2;
let chartFocused = false;

const VIEW_LEVELS = [
    { days: 7, step: 1, unit: 'day', label: 'daily' },
    { days: 14, step: 1, unit: 'day', label: 'daily' },
    { days: 30, step: 1, unit: 'day', label: 'daily' },
    { days: 60, step: 7, unit: 'week', label: 'weekly' },
    { days: 90, step: 7, unit: 'week', label: 'weekly' },
    { days: 120, step: 7, unit: 'week', label: 'weekly' },
    { days: 180, step: 30, unit: 'month', label: 'monthly' },
    { days: 365, step: 30, unit: 'month', label: 'monthly' },
    { days: 730, step: 90, unit: 'quarter', label: 'quarterly' },
    { days: 1095, step: 180, unit: 'season', label: 'seasonal' },
    { days: 1825, step: 365, unit: 'year', label: 'yearly' },
    { days: 3650, step: 365, unit: 'year', label: 'yearly' }
];

let timelineStart = 0;

function getCurrentView() {
    return VIEW_LEVELS[currentViewLevel];
}

function calculateLevel(esterIndex, dose, timeDays, route = 'intramuscular') {
    const ester = esters[esterIndex];
    const estradiolDose = dose * (ester.content / 100);
    const doseNg = estradiolDose * 1000000;

    let f = ester.f;
    if (route === 'subcutaneous') f *= 0.85;

    let ka = ester.ka;
    let ke = ester.ke;
    if (Math.abs(ka - ke) < 0.001) ka += 0.001;

    let vd = ester.vd || 5000;

    const concentration = (doseNg * f * ka / (vd * (ka - ke))) * 
        (Math.exp(-ke * timeDays) - Math.exp(-ka * timeDays));

    return Math.max(0, concentration);
}

function calculateCombinedLevel(currentDay) {
    let total = 0;
    for (const dose of doses) {
        const timeSinceDose = currentDay - dose.day;
        if (timeSinceDose >= 0) {
            total += calculateLevel(dose.esterIndex, dose.dose, timeSinceDose, dose.route);
        }
    }
    return total;
}

function addDose() {
    const esterIndex = parseInt(document.getElementById('ester-select').value);
    const dose = parseFloat(document.getElementById('dose-input').value);
    const day = parseFloat(document.getElementById('day-input').value);
    const route = document.getElementById('route-select').value;

    if (isNaN(dose) || isNaN(day) || dose <= 0 || day < 0) {
        alert('please enter valid dose and day values');
        return;
    }

    const newDose = {
        id: doseIdCounter++,
        esterIndex: esterIndex,
        ester: esters[esterIndex],
        dose: dose,
        day: day,
        route: route
    };

    doses.push(newDose);
    doses.sort((a, b) => a.day - b.day);

    updateDosesList();
    updateChart();
    updateCurrentLevel();

    let suggestedNextDay;
    if (esterIndex === 0) suggestedNextDay = day + 3;
    else if (esterIndex === 1) suggestedNextDay = day + 5;
    else if (esterIndex === 2) suggestedNextDay = day + 7;
    else if (esterIndex === 3) suggestedNextDay = day + 7;
    else if (esterIndex === 4) suggestedNextDay = day + 35;
    else if (esterIndex === 5) suggestedNextDay = day + 42;
    else suggestedNextDay = day + 7;

    document.getElementById('day-input').value = suggestedNextDay;
    document.getElementById('day-input').focus();
    document.getElementById('day-input').select();
}

function removeDose(id) {
    doses = doses.filter(dose => dose.id !== id);
    updateDosesList();
    updateChart();
    updateCurrentLevel();
}

function clearAllDoses() {
    if (confirm('clear all doses?')) {
        doses = [];
        doseIdCounter = 1;
        currentViewLevel = 2;
        timelineStart = 0;

        document.getElementById('dose-input').value = '5';
        document.getElementById('day-input').value = '0';

        updateDosesList();
        updateCurrentLevel();

        if (chart) {
            chart.destroy();
            chart = null;
        }
        updateChart();
    }
}

function updateDosesList() {
    const list = document.getElementById('doses-list');

    if (doses.length === 0) {
        list.innerHTML = '<p class="no-doses">no doses added</p>';
        return;
    }

    list.innerHTML = doses.map(dose => `
        <div class="dose-item">
            <div class="dose-info">
                <div class="dose-header">${dose.ester.name}</div>
                <div class="dose-details">
                    ${dose.dose}mg ${dose.route} • day ${dose.day}
                </div>
            </div>
            <button class="remove-btn" onclick="removeDose(${dose.id})">×</button>
        </div>
    `).join('');
}

function updateCurrentLevel() {
    const currentDay = parseFloat(document.getElementById('current-day-input').value) || 0;
    const level = calculateCombinedLevel(currentDay);

    let color = '#f44336';
    if (level >= 100 && level <= 400) color = '#81c784';
    else if (level >= 50) color = '#ffb74d';

    const levelElement = document.getElementById('current-level');
    levelElement.textContent = level.toFixed(1) + ' pg/mL';
    levelElement.style.color = color;
}

function updateTimeline() {
    const timelineSelect = document.getElementById('timeline-select');
    const customTimelineInput = document.getElementById('custom-timeline-input');

    if (timelineSelect.value === 'custom') {
        const customDays = parseInt(customTimelineInput.value) || 60;
        let closestLevel = 2;
        let closestDiff = Math.abs(VIEW_LEVELS[2].days - customDays);

        for (let i = 0; i < VIEW_LEVELS.length; i++) {
            const diff = Math.abs(VIEW_LEVELS[i].days - customDays);
            if (diff < closestDiff) {
                closestDiff = diff;
                closestLevel = i;
            }
        }
        currentViewLevel = closestLevel;
    } else {
        const targetDays = parseInt(timelineSelect.value);
        for (let i = 0; i < VIEW_LEVELS.length; i++) {
            if (VIEW_LEVELS[i].days === targetDays) {
                currentViewLevel = i;
                break;
            }
        }
    }

    updateChart();
}

function panTimeline(direction) {
    const view = getCurrentView();
    const panAmount = Math.max(1, Math.floor(view.days * 0.1));

    if (direction === 'left') {
        timelineStart = Math.max(0, timelineStart - panAmount);
    } else if (direction === 'right') {
        timelineStart = timelineStart + panAmount;
    }

    updateChart();
    updateViewStatus();
}

function zoomTimeline(direction) {
    if (direction === 'in') {
        if (currentViewLevel > 0) {
            currentViewLevel--;
        }
    } else if (direction === 'out') {
        if (currentViewLevel < VIEW_LEVELS.length - 1) {
            currentViewLevel++;
        }
    }

    updateChart();
    updateViewStatus();
}

function updateViewStatus() {
    const status = document.getElementById('arrow-key-status');
    if (status) {
        const view = getCurrentView();
        const endDay = timelineStart + view.days;
        status.textContent = `viewing: day ${Math.floor(timelineStart)}-${Math.ceil(endDay)} (${view.label} intervals)`;
    }
}

function handleKeydown(e) {
    if (!chartFocused) return;

    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            panTimeline('left');
            break;
        case 'ArrowRight':
            e.preventDefault();
            panTimeline('right');
            break;
        case 'ArrowUp':
            e.preventDefault();
            zoomTimeline('in');
            break;
        case 'ArrowDown':
            e.preventDefault();
            zoomTimeline('out');
            break;
        case 'Home':
            e.preventDefault();
            timelineStart = 0;
            updateChart();
            updateViewStatus();
            break;
        case 'End':
            e.preventDefault();
            const maxDoseDay = doses.length > 0 ? Math.max(...doses.map(d => d.day)) : 0;
            const view = getCurrentView();
            timelineStart = Math.max(0, maxDoseDay - view.days + 30);
            updateChart();
            updateViewStatus();
            break;
    }
}

function updateChart() {
    const currentDay = parseFloat(document.getElementById('current-day-input').value) || 0;
    const view = getCurrentView();

    const timelineMin = timelineStart;
    const timelineMax = timelineStart + view.days;

    const smoothTimePoints = [];
    const smoothLevelData = [];

    for (let day = timelineMin; day <= timelineMax; day += 0.5) {
        smoothTimePoints.push(day);
        smoothLevelData.push(calculateCombinedLevel(day));
    }

    const doseMarkers = doses
        .filter(dose => dose.day >= timelineMin && dose.day <= timelineMax)
        .map(dose => ({
            x: dose.day,
            y: calculateCombinedLevel(dose.day),
            dose: dose
        }));

    const currentMarker = (currentDay >= timelineMin && currentDay <= timelineMax) ? [{
        x: currentDay,
        y: calculateCombinedLevel(currentDay)
    }] : [];

    const ctx = document.getElementById('levels-chart').getContext('2d');

    if (chart) {
        chart.destroy();
        chart = null;
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: smoothTimePoints,
            datasets: [{
                label: 'estradiol level',
                data: smoothLevelData,
                borderColor: '#4fc3f7',
                backgroundColor: 'rgba(79, 195, 247, 0.1)',
                borderWidth: 2,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 4
            }, {
                label: 'therapeutic range',
                data: smoothTimePoints.map(() => 100),
                borderColor: 'rgba(129, 199, 132, 0.5)',
                backgroundColor: 'rgba(129, 199, 132, 0.1)',
                borderWidth: 1,
                fill: '+1',
                pointRadius: 0
            }, {
                label: '',
                data: smoothTimePoints.map(() => 400),
                borderColor: 'rgba(129, 199, 132, 0.5)',
                backgroundColor: 'transparent',
                borderWidth: 1,
                fill: false,
                pointRadius: 0
            }, {
                label: 'doses',
                data: doseMarkers,
                showLine: false,
                pointRadius: 8,
                pointStyle: 'triangle',
                backgroundColor: doseMarkers.map(d => d.dose.ester.color),
                borderColor: doseMarkers.map(d => d.dose.ester.color),
                borderWidth: 2
            }, {
                label: 'current day',
                data: currentMarker,
                showLine: false,
                pointRadius: 6,
                pointStyle: 'circle',
                backgroundColor: '#ff6b6b',
                borderColor: '#ff6b6b',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#e0e0e0',
                        font: { family: 'Segoe UI', size: 10 },
                        filter: function(item) { return item.text !== ''; }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(45, 45, 45, 0.95)',
                    titleColor: '#e0e0e0',
                    bodyColor: '#e0e0e0',
                    borderColor: '#404040',
                    borderWidth: 1,
                    callbacks: {
                        title: function(context) {
                            const day = context[0].parsed.x;
                            return `day ${Math.round(day)}`;
                        },
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return `level: ${context.parsed.y.toFixed(1)} pg/mL`;
                            } else if (context.datasetIndex === 3 && context.raw.dose) {
                                return `${context.raw.dose.ester.name}: ${context.raw.dose.dose}mg`;
                            } else if (context.datasetIndex === 4) {
                                return `current: ${context.parsed.y.toFixed(1)} pg/mL`;
                            }
                            return null;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { 
                        display: true, 
                        text: `${view.label} (day ${Math.floor(timelineMin)}-${Math.ceil(timelineMax)})`, 
                        color: '#b0b0b0' 
                    },
                    ticks: { 
                        color: '#b0b0b0',
                        maxTicksLimit: 12
                    },
                    grid: { color: '#404040' },
                    min: timelineMin,
                    max: timelineMax
                },
                y: {
                    title: { display: true, text: 'estradiol (pg/mL)', color: '#b0b0b0' },
                    ticks: { color: '#b0b0b0' },
                    grid: { color: '#404040' },
                    min: 0
                }
            }
        }
    });

    updateViewStatus();
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('day-input').value = '0';

    document.getElementById('add-dose-btn').addEventListener('click', addDose);
    document.getElementById('clear-all-btn').addEventListener('click', clearAllDoses);
    document.getElementById('timeline-select').addEventListener('change', updateTimeline);
    document.getElementById('custom-timeline-input').addEventListener('input', updateTimeline);
    document.getElementById('current-day-input').addEventListener('input', function() {
        updateCurrentLevel();
        updateChart();
    });

    document.addEventListener('keydown', handleKeydown);

    const chartContainer = document.getElementById('levels-chart');
    const chartArea = chartContainer.parentElement;

    chartArea.addEventListener('click', function() {
        chartFocused = true;
        chartArea.focus();
        chartArea.style.outline = '2px solid #4fc3f7';
    });

    chartArea.addEventListener('blur', function() {
        chartFocused = false;
        chartArea.style.outline = 'none';
    });

    chartArea.addEventListener('focus', function() {
        chartFocused = true;
        chartArea.style.outline = '2px solid #4fc3f7';
    });

    ['dose-input', 'day-input'].forEach(id => {
        document.getElementById(id).addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addDose();
        });
    });

    document.getElementById('ester-select').addEventListener('change', function() {
        const currentDay = parseFloat(document.getElementById('day-input').value) || 0;

        if (currentDay === 0 && doses.length === 0) {
            const esterIndex = parseInt(this.value);
            let suggestedInterval;
            if (esterIndex === 0) suggestedInterval = 3;
            else if (esterIndex === 1) suggestedInterval = 5;
            else if (esterIndex === 2) suggestedInterval = 7;
            else if (esterIndex === 3) suggestedInterval = 7;
            else if (esterIndex === 4) suggestedInterval = 35;
            else if (esterIndex === 5) suggestedInterval = 42;
            else suggestedInterval = 7;

            document.getElementById('day-input').value = suggestedInterval;
        }
    });

    updateChart();
    updateCurrentLevel();

    console.log('kikis estrogen delivery service loaded');
});
