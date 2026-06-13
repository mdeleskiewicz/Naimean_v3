import { CLOCK_URL_IOS, CLOCK_URL_WINDOWS, DVD_ACCELEROMETER_DEFAULT_POSITION, DVD_ACCELEROMETER_MULTIPLIER_MAX, DVD_ACCELEROMETER_MULTIPLIER_MIN, RADIO_TUNING_AUDIO_URLS, RADIO_TUNING_STATION_POSITIONS, RADIO_TUNING_STATION_WIDTH } from '../core/constants.js';
import { state } from '../core/state.js';
import { clamp } from '../core/utils.js';

const isIOSDevice =
  /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

function openClockApp() {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) {
    window.location.href = CLOCK_URL_WINDOWS;
  } else if (isIOSDevice) {
    window.location.href = CLOCK_URL_IOS;
  } else {
    window.open('https://time.is', '_blank', 'noopener,noreferrer');
  }
}

function createFlipCard(isMonth) {
  const el = document.createElement('div');
  el.className = isMonth ? 'fc-month' : 'fc-digit';
  el.dataset.val = '';

  const top = document.createElement('div');
  top.className = 'fc-top';
  const topNum = document.createElement('span');
  topNum.className = 'fc-num';
  top.appendChild(topNum);

  const bot = document.createElement('div');
  bot.className = 'fc-bot';
  const botNum = document.createElement('span');
  botNum.className = 'fc-num';
  bot.appendChild(botNum);

  el.appendChild(top);
  el.appendChild(bot);
  return el;
}

function setFlipCard(el, newVal, animate) {
  const oldVal = el.dataset.val;
  if (oldVal === newVal) return;

  const topNum = el.querySelector('.fc-top .fc-num');
  const botNum = el.querySelector('.fc-bot .fc-num');

  if (!animate || oldVal === '') {
    topNum.textContent = newVal;
    botNum.textContent = newVal;
    el.dataset.val = newVal;
    return;
  }

  // Show new bottom value immediately (hidden behind flap during phase 1)
  botNum.textContent = newVal;

  // Phase 1: old top folds away
  const flap1 = document.createElement('div');
  flap1.className = 'fc-flap fc-flap-p1';
  const flap1Num = document.createElement('span');
  flap1Num.className = 'fc-num';
  flap1Num.textContent = oldVal;
  flap1.appendChild(flap1Num);
  el.appendChild(flap1);

  flap1.addEventListener('animationend', () => {
    flap1.remove();
    topNum.textContent = newVal;

    // Phase 2: new top unfolds in
    const flap2 = document.createElement('div');
    flap2.className = 'fc-flap fc-flap-p2';
    const flap2Num = document.createElement('span');
    flap2Num.className = 'fc-num';
    flap2Num.textContent = newVal;
    flap2.appendChild(flap2Num);
    el.appendChild(flap2);

    flap2.addEventListener('animationend', () => {
      flap2.remove();
    }, { once: true });
  }, { once: true });

  el.dataset.val = newVal;
}

function applyRadioTuningPosition(scaleBlock, value) {
  const clamped = clamp(value, 0, 1);
  scaleBlock.style.setProperty('--rc-tuning-position', `${(clamped * 100).toFixed(2)}%`);
  return clamped;
}

function getDvdAccelerometerMultiplier(position) {
  const clampedPosition = clamp(position, 0, 1);
  return DVD_ACCELEROMETER_MULTIPLIER_MIN
    + (clampedPosition * (DVD_ACCELEROMETER_MULTIPLIER_MAX - DVD_ACCELEROMETER_MULTIPLIER_MIN));
}

function formatDvdAccelerometerPercent(multiplier) {
  const percent = Math.round(multiplier * 100);
  return `${percent}%`;
}

function syncDvdAccelerometerFromTuningPosition(position, sliderEl) {
  state.dvdSpeedMultiplier = getDvdAccelerometerMultiplier(position);
  const percentText = formatDvdAccelerometerPercent(state.dvdSpeedMultiplier);
  sliderEl.setAttribute('aria-valuenow', String(Math.round(state.dvdSpeedMultiplier * 100)));
  sliderEl.setAttribute('aria-valuetext', `DVD accelerometer ${percentText}`);
}

function getRadioStationStrength(position) {
  const clampedPosition = clamp(position, 0, 1);
  const strongestStationDistance = RADIO_TUNING_STATION_POSITIONS.reduce(
    (closest, stationPosition) => Math.min(closest, Math.abs(clampedPosition - stationPosition)),
    Number.POSITIVE_INFINITY
  );
  const ratio = strongestStationDistance / RADIO_TUNING_STATION_WIDTH;
  return clamp(Math.exp(-(ratio * ratio) * 2), 0, 1);
}

function resetRadioTuningPlayback(audioEl) {
  audioEl.playbackRate = 1;
  audioEl.volume = 1;
}

function ensureRadioTuningLoopPlayback(audioEl) {
  if (!audioEl.paused) return;
  const playPromise = audioEl.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {});
  }
}

function stopRadioTuningLoopPlayback(audioEl) {
  audioEl.pause();
  audioEl.currentTime = 0;
  audioEl.playbackRate = 1;
  audioEl.volume = 1;
  if (audioEl.__radioTuningState) {
    audioEl.__radioTuningState.movementEnergy = 0;
  }
}

function getNextRadioTuningAudioUrl() {
  if (!state.flipClockRadioTuningAudioCycle.length) {
    state.flipClockRadioTuningAudioCycle = [...RADIO_TUNING_AUDIO_URLS];
    for (let i = state.flipClockRadioTuningAudioCycle.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const swapValue = state.flipClockRadioTuningAudioCycle[i];
      state.flipClockRadioTuningAudioCycle[i] = state.flipClockRadioTuningAudioCycle[j];
      state.flipClockRadioTuningAudioCycle[j] = swapValue;
    }
  }
  return state.flipClockRadioTuningAudioCycle.pop();
}

function getRadioTuningAudioElement(audioUrl) {
  let audioEl = state.flipClockRadioTuningAudioElsByUrl.get(audioUrl);
  if (!audioEl) {
    audioEl = new Audio(audioUrl);
    audioEl.preload = 'metadata';
    audioEl.loop = true;
    state.flipClockRadioTuningAudioElsByUrl.set(audioUrl, audioEl);
  }
  return audioEl;
}

function startFlipClock(container) {
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun',
                       'Jul','Aug','Sep','Oct','Nov','Dec'];

  // Cache card references once to avoid repeated DOM queries
  const cards = {
    h1: container.querySelector('[data-key="h1"]'),
    h2: container.querySelector('[data-key="h2"]'),
    m1: container.querySelector('[data-key="m1"]'),
    m2: container.querySelector('[data-key="m2"]'),
    dateBadge: container.querySelector('[data-key="date-badge"]')
  };

  function tick(animate) {
    const now = new Date();
    const hours24 = now.getHours();
    const hh = String(hours24).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const dateBadge = `${MONTH_NAMES[now.getMonth()].toUpperCase()} ${String(now.getDate()).padStart(2, '0')}`;

    setFlipCard(cards.h1, hh[0], animate);
    setFlipCard(cards.h2, hh[1], animate);
    setFlipCard(cards.m1, mm[0], animate);
    setFlipCard(cards.m2, mm[1], animate);
    if (cards.dateBadge) {
      cards.dateBadge.textContent = dateBadge;
    }
  }

  tick(false); // Initial render without animation

  // Align the first animated tick to the next full second boundary,
  // then switch to a regular 1 s interval for subsequent ticks.
  const msUntilNextSecond = 1000 - new Date().getMilliseconds();
  state.flipClockAlignTimeoutId = setTimeout(() => {
    state.flipClockAlignTimeoutId = null;
    tick(true);
    state.flipClockIntervalId = setInterval(() => tick(true), 1000);
  }, msUntilNextSecond);
}

function initFlipClock(container) {
  startFlipClock(container);
}

function updateFlipClock(container) {
  startFlipClock(container);
}

state._cb.openClockApp = openClockApp;

export { createFlipCard, setFlipCard, applyRadioTuningPosition, getDvdAccelerometerMultiplier, formatDvdAccelerometerPercent, syncDvdAccelerometerFromTuningPosition, getRadioStationStrength, resetRadioTuningPlayback, ensureRadioTuningLoopPlayback, stopRadioTuningLoopPlayback, getNextRadioTuningAudioUrl, getRadioTuningAudioElement, startFlipClock, initFlipClock, updateFlipClock, openClockApp };
