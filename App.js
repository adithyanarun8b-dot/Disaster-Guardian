/* ============================================================
   Disaster Guardian – app.js
   ============================================================ */

/* ── Constants ─────────────────────────────────────────── */
const MAX_SAMPLES               = 200;
const MAX_RECENT_ANOMALIES      = 5;
const DEFAULT_ANOMALY_THRESHOLD = 1.0;
const MIN_ANOMALY_THRESHOLD     = 0.0;
const MAX_SLIDER_ANOMALY_THRESHOLD = 20.0;
const ANOMALY_THRESHOLD_STEP    = 0.1;

/* ── State ─────────────────────────────────────────────── */
const samples  = [];
const anomalies = [];
let hasDataFromBackend = false;
let feedbackTimeout   = null;
let uptimeInterval    = null;
let uptimeSeconds     = 0;
let totalAlerts       = 0;

/* ── Canvas ─────────────────────────────────────────────── */
const canvas = document.getElementById('plot');
const ctx    = canvas.getContext('2d');

function drawPlot() {
    if (!hasDataFromBackend) return;

    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    if (canvas.width !== W || canvas.height !== H) {
        canvas.width  = W;
        canvas.height = H;
    }

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#1a1e2a';
    ctx.fillRect(0, 0, W, H);

    const PAD_L = 44, PAD_R = 12, PAD_T = 14, PAD_B = 14;
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;
    const midY  = PAD_T + plotH / 2;
    const scaleY = plotH / 8; // ±4 m/s²

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth   = 0.5;
    for (let i = 0; i <= 8; i++) {
        const y = PAD_T + i * (plotH / 8);
        ctx.beginPath();
        ctx.moveTo(PAD_L, y);
        ctx.lineTo(W - PAD_R, y);
        ctx.stroke();
    }

    // Zero line
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(PAD_L, midY);
    ctx.lineTo(W - PAD_R, midY);
    ctx.stroke();

    // Y labels
    ctx.fillStyle = 'rgba(122,128,153,0.8)';
    ctx.font      = '400 10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 8; i++) {
        const y   = PAD_T + i * (plotH / 8);
        const val = (4.0 - i * 1.0).toFixed(1);
        ctx.fillText(val, PAD_L - 6, y);
    }

    // Series
    function drawSeries(key, color) {
        if (samples.length < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth   = 1.5;
        ctx.shadowColor = color;
        ctx.shadowBlur  = 3;
        ctx.beginPath();
        for (let i = 0; i < samples.length; i++) {
            const x = PAD_L + (i / (MAX_SAMPLES - 1)) * plotW;
            const v = samples[i][key];
            const y = midY - v * scaleY;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    drawSeries('x', '#4f8ef7');
    drawSeries('y', '#f7a23e');
    drawSeries('z', '#e05c2a');
}

function pushSample(s) {
    samples.push(s);
    if (samples.length > MAX_SAMPLES) samples.shift();

    if (!hasDataFromBackend) {
        hasDataFromBackend = true;
        renderAccelerometerData();
        startUptime();
    }

    // Update live axis readout
    const latest = samples[samples.length - 1];
    document.getElementById('xVal').textContent = latest.x.toFixed(3);
    document.getElementById('yVal').textContent = latest.y.toFixed(3);
    document.getElementById('zVal').textContent = latest.z.toFixed(3);
    const mag = Math.sqrt(latest.x**2 + latest.y**2 + latest.z**2);
    document.getElementById('magVal').textContent = mag.toFixed(3);

    drawPlot();
}

/* ── Uptime Counter ────────────────────────────────────── */
function startUptime() {
    if (uptimeInterval) return;
    uptimeInterval = setInterval(() => {
        uptimeSeconds++;
        const h = String(Math.floor(uptimeSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((uptimeSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(uptimeSeconds % 60).padStart(2, '0');
        document.getElementById('uptimeBadge').textContent = `⏱ ${h}:${m}:${s}`;
    }, 1000);
}

/* ── Socket ────────────────────────────────────────────── */
const socket = io(`http://${window.location.host}`);

function initSocketIO() {
    socket.on('anomaly_detected', (message) => {
        if (!hasDataFromBackend) {
            hasDataFromBackend = true;
            renderAccelerometerData();
        }
        printAnomalies(message);
        renderAnomalies();
        try {
            const parsed = JSON.parse(message);
            updateFeedback(parsed.score);
            showAlertBanner(parsed.score);
        } catch (e) {
            console.error('Failed to parse anomaly:', e);
            updateFeedback(null);
        }
        // Danger status pill
        const pill = document.getElementById('statusPill');
        pill.className = 'status-pill danger';
        document.getElementById('statusText').textContent = 'ALERT';
        setTimeout(() => {
            pill.className = 'status-pill connected';
            document.getElementById('statusText').textContent = 'Monitoring';
        }, 4000);
    });

    socket.on('sample', (s) => pushSample(s));

    socket.on('connect', () => {
        const pill = document.getElementById('statusPill');
        pill.className = 'status-pill connected';
        document.getElementById('statusText').textContent = 'Monitoring';
        document.getElementById('error-container').style.display = 'none';
    });

    socket.on('disconnect', () => {
        const pill = document.getElementById('statusPill');
        pill.className = 'status-pill';
        document.getElementById('statusText').textContent = 'Disconnected';
        document.getElementById('error-container').style.display = 'block';
        if (uptimeInterval) { clearInterval(uptimeInterval); uptimeInterval = null; }
    });
}

/* ── Alert Banner ──────────────────────────────────────── */
function showAlertBanner(score) {
    const banner = document.getElementById('alertBanner');
    document.getElementById('alertBannerText').textContent =
        `Seismic anomaly detected! Score: ${score.toFixed(2)} — Verify surroundings immediately.`;
    banner.style.display = 'flex';
    clearTimeout(window._bannerTimeout);
    window._bannerTimeout = setTimeout(() => { banner.style.display = 'none'; }, 6000);
}

function dismissAlert() {
    document.getElementById('alertBanner').style.display = 'none';
}

/* ── Feedback / Status ─────────────────────────────────── */
function updateFeedback(anomalyScore = null) {
    clearTimeout(feedbackTimeout);
    const wrapper = document.getElementById('feedback-content-wrapper');

    if (!hasDataFromBackend) {
        wrapper.innerHTML = `
            <div class="status-safe">
                <div class="status-icon-wrap safe-icon" style="background:rgba(122,128,153,0.1);color:var(--muted);border-color:var(--border2)">—</div>
                <p class="status-label" style="color:var(--muted)">STANDBY</p>
                <p class="status-sub">Awaiting sensor data</p>
            </div>`;
        return;
    }

    if (anomalyScore !== null) {
        wrapper.innerHTML = `
            <div class="status-danger">
                <div class="status-icon-wrap danger-icon">⚠</div>
                <p class="status-label danger-label">DANGER</p>
                <p class="status-sub">Abnormal vibration detected</p>
                <span class="score-badge">Score: ${anomalyScore.toFixed(2)}</span>
            </div>`;
        feedbackTimeout = setTimeout(() => updateFeedback(null), 4000);
    } else {
        wrapper.innerHTML = `
            <div class="status-safe">
                <div style="position:relative;width:56px;height:56px;">
                    <div class="pulse-ring"></div>
                    <div class="status-icon-wrap safe-icon" style="position:absolute;inset:0;width:100%;height:100%;">✓</div>
                </div>
                <p class="status-label safe-label">SAFE</p>
                <p class="status-sub">No anomalies detected</p>
            </div>`;
    }
}

/* ── Anomaly List ──────────────────────────────────────── */
function printAnomalies(newAnomaly) {
    anomalies.unshift(newAnomaly);
    if (anomalies.length > MAX_RECENT_ANOMALIES) anomalies.pop();
    totalAlerts++;
    const badge = document.getElementById('alertCountBadge');
    badge.textContent = totalAlerts;
    badge.style.display = 'inline-flex';
}

function renderAnomalies() {
    const el = document.getElementById('recentClassifications');
    el.innerHTML = '';

    if (anomalies.length === 0) {
        el.innerHTML = `
            <div class="no-recent-anomalies">
                <p>No alerts recorded yet</p>
            </div>`;
        return;
    }

    anomalies.forEach((anomaly) => {
        try {
            const parsed = JSON.parse(anomaly);
            if (Object.keys(parsed).length === 0) return;

            const li = document.createElement('li');
            li.className = 'anomaly-list-item';

            const date       = new Date(parsed.timestamp);
            const timeString = date.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
            const dateString = date.toLocaleDateString('en-GB', { day:'2-digit', month:'short' });

            li.innerHTML = `
                <div class="anomaly-dot"></div>
                <span class="anomaly-score">${parsed.score.toFixed(2)}</span>
                <span class="anomaly-text">Seismic alert</span>
                <span class="anomaly-time">${timeString}<br>${dateString}</span>`;

            el.appendChild(li);
        } catch (e) {
            console.error('Failed to parse anomaly data:', anomaly, e);
        }
    });
}

/* ── Accelerometer Display ─────────────────────────────── */
function renderAccelerometerData() {
    const display = document.getElementById('accelerometer-data-display');
    const placeholder = document.getElementById('no-accelerometer-data');
    if (hasDataFromBackend) {
        display.style.display = 'block';
        placeholder.style.display = 'none';
        drawPlot();
    } else {
        display.style.display = 'none';
        placeholder.style.display = 'flex';
    }
}

/* ── Confidence Slider ─────────────────────────────────── */
function normalizeThreshold(value) {
    const n = parseFloat(value);
    return isNaN(n) ? DEFAULT_ANOMALY_THRESHOLD : Math.max(MIN_ANOMALY_THRESHOLD, n);
}
function getSliderValue(value) {
    return Math.min(MAX_SLIDER_ANOMALY_THRESHOLD, normalizeThreshold(value));
}
function formatThreshold(value) {
    return normalizeThreshold(value).toFixed(1);
}

function updateConfidenceDisplay(threshold = null) {
    const slider  = document.getElementById('confidenceSlider');
    const input   = document.getElementById('confidenceInput');
    const display = document.getElementById('confidenceValueDisplay');
    const fill    = document.getElementById('sliderProgress');

    const value      = threshold === null ? normalizeThreshold(slider.value) : normalizeThreshold(threshold);
    const sliderVal  = getSliderValue(value);
    slider.value     = sliderVal;
    socket.emit('override_th', value);

    const pct = (sliderVal - parseFloat(slider.min)) / (parseFloat(slider.max) - parseFloat(slider.min)) * 100;
    const displayVal = formatThreshold(value);

    display.textContent  = displayVal;
    display.style.left   = pct + '%';
    fill.style.width     = pct + '%';

    if (document.activeElement !== input) input.value = displayVal;
}

function resetConfidence() {
    document.getElementById('confidenceSlider').value = DEFAULT_ANOMALY_THRESHOLD.toString();
    document.getElementById('confidenceInput').value  = formatThreshold(DEFAULT_ANOMALY_THRESHOLD);
    updateConfidenceDisplay();
}

function initializeConfidenceSlider() {
    const slider = document.getElementById('confidenceSlider');
    const input  = document.getElementById('confidenceInput');
    const resetBtn = document.getElementById('confidenceResetButton');

    slider.min   = MIN_ANOMALY_THRESHOLD.toString();
    slider.max   = MAX_SLIDER_ANOMALY_THRESHOLD.toString();
    slider.step  = ANOMALY_THRESHOLD_STEP.toString();
    slider.value = DEFAULT_ANOMALY_THRESHOLD.toString();
    input.min    = MIN_ANOMALY_THRESHOLD.toString();
    input.step   = ANOMALY_THRESHOLD_STEP.toString();
    input.value  = formatThreshold(DEFAULT_ANOMALY_THRESHOLD);

    slider.addEventListener('input', () => updateConfidenceDisplay());
    input.addEventListener('input', () => updateConfidenceDisplay(normalizeThreshold(input.value)));
    input.addEventListener('blur', () => {
        const v = normalizeThreshold(input.value);
        input.value = formatThreshold(v);
        updateConfidenceDisplay(v);
    });
    resetBtn.addEventListener('click', resetConfidence);
    updateConfidenceDisplay();
}

/* ── Boot ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    initSocketIO();
    renderAccelerometerData();
    renderAnomalies();
    updateFeedback(null);
    initializeConfidenceSlider();
});

window.addEventListener('resize', () => {
    if (hasDataFromBackend) drawPlot();
});