/**
 * Local calendar API adapter for the imported v2 calendar UI.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'naimean.v3.calendar.events';
  const DEFAULT_CREATOR = 'Naimean';
  const MAX_OCCURRENCES = 512;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const WEEKDAY_INDEX = new Map(WEEKDAY_CODES.map((code, index) => [code, index]));
  const CALENDAR_SYNC_ENDPOINT = '/api/calendar-events';
  const CALENDAR_SYNC_STATUS = {
    SAVED: 'saved',
    SYNCING: 'syncing',
    OFFLINE: 'offline',
    NOT_SYNCING: 'not-syncing'
  };
  const calendarSyncSubscribers = new Set();
  let calendarSessionChecked = false;
  let calendarSyncInitialized = false;
  let calendarIsAuthenticated = false;
  let calendarSyncInFlight = 0;
  let calendarSyncErrored = false;
  let calendarSessionCheckFailed = false;
  let lastCalendarSyncStatus = null;

  function loadEvents() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (_) {
      return [];
    }
  }

  function saveEvents(events) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  function isOffline() {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  }

  function toTimestamp(value) {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.floor(n);
    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return Math.floor(parsed);
    }
    return null;
  }

  function toIsoTimestamp(ts) {
    return Number.isFinite(ts) ? new Date(ts).toISOString() : null;
  }

  function getEventUpdatedAt(event) {
    return toTimestamp(event && event.updatedAt)
      || toTimestamp(event && event.createdAt)
      || 0;
  }

  function getCalendarSyncStatus() {
    if (calendarSessionChecked && !calendarIsAuthenticated && !calendarSessionCheckFailed) {
      return CALENDAR_SYNC_STATUS.NOT_SYNCING;
    }
    if (calendarSyncInFlight > 0 || !calendarSyncInitialized) return CALENDAR_SYNC_STATUS.SYNCING;
    if (calendarSyncErrored || isOffline()) return CALENDAR_SYNC_STATUS.OFFLINE;
    return CALENDAR_SYNC_STATUS.SAVED;
  }

  function notifyCalendarSyncStatus(force = false) {
    const status = getCalendarSyncStatus();
    if (!force && status === lastCalendarSyncStatus) return;
    lastCalendarSyncStatus = status;
    calendarSyncSubscribers.forEach((listener) => {
      try {
        listener(status);
      } catch (_) {}
    });
  }

  function subscribeCalendarSyncStatus(listener) {
    if (typeof listener !== 'function') return function noop() {};
    calendarSyncSubscribers.add(listener);
    try {
      listener(getCalendarSyncStatus());
    } catch (_) {}
    return function unsubscribe() {
      calendarSyncSubscribers.delete(listener);
    };
  }

  async function getAuthSession() {
    return fetch('/api/discord/me', { credentials: 'include', cache: 'no-store' });
  }

  async function ensureCalendarSessionState() {
    if (calendarSessionChecked) return;
    calendarSyncInFlight += 1;
    notifyCalendarSyncStatus();
    try {
      const res = await getAuthSession();
      const body = res.ok ? await res.json().catch(() => null) : null;
      calendarIsAuthenticated = Boolean(body && body.authenticated);
      calendarSessionChecked = true;
      calendarSessionCheckFailed = false;
      if (!calendarIsAuthenticated) {
        calendarSyncErrored = false;
      }
    } catch (_) {
      calendarSessionChecked = true;
      calendarSessionCheckFailed = true;
      calendarSyncErrored = true;
    } finally {
      calendarSyncInFlight = Math.max(0, calendarSyncInFlight - 1);
      notifyCalendarSyncStatus();
    }
  }

  function eventFromServerRow(row) {
    if (!row || typeof row !== 'object') return null;
    const data = row.data && typeof row.data === 'object' && !Array.isArray(row.data) ? row.data : {};
    const id = typeof row.id === 'string' && row.id.trim() ? row.id.trim() : (typeof data.id === 'string' ? data.id.trim() : '');
    if (!id) return null;
    const startTs = toTimestamp(data.startTs) ?? toTimestamp(row.startAt);
    const endTs = toTimestamp(data.endTs) ?? toTimestamp(row.endAt);
    if (!Number.isFinite(startTs) || !Number.isFinite(endTs)) return null;
    const title = typeof data.title === 'string' && data.title.trim()
      ? data.title.trim()
      : typeof row.title === 'string'
        ? row.title.trim()
        : '';
    if (!title) return null;
    const serverUpdatedAt = toTimestamp(row.updatedAt) ?? toTimestamp(data.updatedAt) ?? Date.now();
    return {
      id,
      title,
      description: typeof data.description === 'string' ? data.description : '',
      startTs: Math.floor(startTs),
      endTs: Math.floor(endTs),
      allDay: Boolean(data.allDay),
      color: typeof data.color === 'string' && data.color.trim() ? data.color.trim() : '#55FF55',
      eventType: typeof data.eventType === 'string' && data.eventType.trim() ? data.eventType.trim() : '',
      recurrenceRule: normalizeRule(data.recurrenceRule),
      calendarId: typeof data.calendarId === 'string' && data.calendarId.trim() ? data.calendarId.trim() : 'family',
      createdBy: typeof data.createdBy === 'string' && data.createdBy ? data.createdBy : 'local-user',
      createdByName: typeof data.createdByName === 'string' && data.createdByName ? data.createdByName : DEFAULT_CREATOR,
      createdAt: toTimestamp(data.createdAt) ?? serverUpdatedAt,
      updatedAt: serverUpdatedAt,
      updatedByName: typeof data.updatedByName === 'string' && data.updatedByName ? data.updatedByName : DEFAULT_CREATOR
    };
  }

  function mergeServerEvents(serverRows) {
    const localEvents = loadEvents();
    const byId = new Map(localEvents.map((event) => [event.id, event]));
    (Array.isArray(serverRows) ? serverRows : []).forEach((row) => {
      const serverEvent = eventFromServerRow(row);
      if (!serverEvent) return;
      const localEvent = byId.get(serverEvent.id);
      if (!localEvent) {
        byId.set(serverEvent.id, serverEvent);
        return;
      }
      const localUpdatedAt = getEventUpdatedAt(localEvent);
      const serverUpdatedAt = getEventUpdatedAt(serverEvent);
      if (serverUpdatedAt >= localUpdatedAt) {
        byId.set(serverEvent.id, serverEvent);
      }
    });
    const merged = [...byId.values()];
    saveEvents(merged);
    return merged;
  }

  function updateLocalEventUpdatedAt(id, updatedAt) {
    const updatedTs = toTimestamp(updatedAt);
    if (!id || !Number.isFinite(updatedTs)) return;
    const events = loadEvents();
    const index = events.findIndex((event) => event.id === id);
    if (index === -1) return;
    events[index] = { ...events[index], updatedAt: updatedTs };
    saveEvents(events);
  }

  function serverPayloadFromEvent(event) {
    const startAt = toIsoTimestamp(event.startTs);
    const endAt = toIsoTimestamp(event.endTs);
    return {
      id: event.id,
      title: event.title,
      startAt,
      endAt,
      data: {
        ...event,
        startTs: event.startTs,
        endTs: event.endTs,
        updatedAt: event.updatedAt
      }
    };
  }

  async function fetchAndMergeServerEvents() {
    if (!calendarIsAuthenticated) return;
    if (isOffline()) {
      calendarSyncErrored = true;
      notifyCalendarSyncStatus();
      return;
    }
    calendarSyncInFlight += 1;
    notifyCalendarSyncStatus();
    try {
      const res = await fetch(CALENDAR_SYNC_ENDPOINT, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
      });
      if (res.status === 401) {
        calendarIsAuthenticated = false;
        calendarSessionCheckFailed = false;
        calendarSyncErrored = false;
        return;
      }
      if (!res.ok) throw new Error(`Failed to fetch calendar events (${res.status}).`);
      const body = await res.json().catch(() => ({}));
      mergeServerEvents(body && body.events);
      calendarSyncErrored = false;
    } catch (_) {
      calendarSyncErrored = true;
    } finally {
      calendarSyncInFlight = Math.max(0, calendarSyncInFlight - 1);
      notifyCalendarSyncStatus();
    }
  }

  async function initCalendarSync() {
    if (calendarSyncInitialized) return;
    await ensureCalendarSessionState();
    if (calendarIsAuthenticated) {
      await fetchAndMergeServerEvents();
    }
    calendarSyncInitialized = true;
    notifyCalendarSyncStatus(true);
  }

  function runServerSyncRequest(requestFactory, onSuccess) {
    if (!calendarIsAuthenticated) {
      notifyCalendarSyncStatus();
      return;
    }
    if (isOffline()) {
      calendarSyncErrored = true;
      notifyCalendarSyncStatus();
      return;
    }
    calendarSyncInFlight += 1;
    notifyCalendarSyncStatus();
    Promise.resolve()
      .then(() => requestFactory())
      .then(async (res) => {
        if (res.status === 401) {
          calendarIsAuthenticated = false;
          calendarSessionCheckFailed = false;
          calendarSyncErrored = false;
          return null;
        }
        if (!res.ok) throw new Error(`Calendar sync failed: ${res.status}`);
        const body = await res.json().catch(() => ({}));
        calendarSyncErrored = false;
        if (typeof onSuccess === 'function') onSuccess(body);
        return null;
      })
      .catch(() => {
        calendarSyncErrored = true;
      })
      .finally(() => {
        calendarSyncInFlight = Math.max(0, calendarSyncInFlight - 1);
        notifyCalendarSyncStatus();
      });
  }

  async function queueCalendarMutationSync(requestFactory, onSuccess) {
    await ensureCalendarSessionState();
    runServerSyncRequest(requestFactory, onSuccess);
  }

  function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'content-type': 'application/json; charset=UTF-8',
        'cache-control': 'no-store'
      }
    });
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `event-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }

  function normalizeRule(rule) {
    if (!rule || typeof rule !== 'object' || typeof rule.freq !== 'string') return null;
    const freq = rule.freq.toUpperCase();
    if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) return null;
    const interval = Number.isFinite(rule.interval) && rule.interval > 0 ? Math.floor(rule.interval) : 1;
    const normalized = { freq, interval };
    if (Array.isArray(rule.byday)) {
      const byday = rule.byday
        .map((code) => String(code || '').toUpperCase())
        .filter((code) => WEEKDAY_INDEX.has(code));
      if (byday.length) normalized.byday = [...new Set(byday)];
    }
    if (Number.isFinite(rule.until)) normalized.until = Math.floor(rule.until);
    if (Number.isFinite(rule.count) && rule.count > 0) normalized.count = Math.floor(rule.count);
    return normalized;
  }

  function normalizeEvent(input, existing = null) {
    const title = String(input && input.title || '').trim();
    if (!title) {
      throw new Error('Title is required.');
    }
    const startTs = Number(input && input.startTs);
    const endTs = Number(input && input.endTs);
    if (!Number.isFinite(startTs) || !Number.isFinite(endTs)) {
      throw new Error('Start and end times are required.');
    }
    if (endTs < startTs) {
      throw new Error('End must be on or after the start.');
    }
    const now = Date.now();
    const createdByName = existing && existing.createdByName ? existing.createdByName : DEFAULT_CREATOR;
    return {
      id: existing && existing.id ? existing.id : makeId(),
      title,
      description: input && input.description ? String(input.description) : '',
      startTs: Math.floor(startTs),
      endTs: Math.floor(endTs),
      allDay: Boolean(input && input.allDay),
      color: input && typeof input.color === 'string' && input.color.trim() ? input.color.trim() : '#55FF55',
      eventType: input && typeof input.eventType === 'string' && input.eventType.trim() ? input.eventType.trim() : '',
      recurrenceRule: normalizeRule(input && input.recurrenceRule),
      calendarId: input && typeof input.calendarId === 'string' && input.calendarId.trim() ? input.calendarId.trim() : (existing && existing.calendarId) || 'family',
      createdBy: existing && existing.createdBy ? existing.createdBy : 'local-user',
      createdByName,
      createdAt: existing && existing.createdAt ? existing.createdAt : now,
      updatedAt: now,
      updatedByName: DEFAULT_CREATOR
    };
  }

  function startOfDay(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function addMonths(ts, count) {
    const d = new Date(ts);
    const day = d.getDate();
    d.setMonth(d.getMonth() + count, 1);
    const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, maxDay));
    return d.getTime();
  }

  function addYears(ts, count) {
    const d = new Date(ts);
    const month = d.getMonth();
    const day = d.getDate();
    d.setFullYear(d.getFullYear() + count, month, 1);
    const maxDay = new Date(d.getFullYear(), month + 1, 0).getDate();
    d.setDate(Math.min(day, maxDay));
    return d.getTime();
  }

  function shiftOccurrence(ts, freq, interval) {
    if (freq === 'DAILY') return ts + (DAY_MS * interval);
    if (freq === 'WEEKLY') return ts + (DAY_MS * 7 * interval);
    if (freq === 'MONTHLY') return addMonths(ts, interval);
    if (freq === 'YEARLY') return addYears(ts, interval);
    return ts;
  }

  function expandRecurringEvent(event, fromTs, toTs) {
    const rule = normalizeRule(event.recurrenceRule);
    if (!rule) return [decorateEvent(event)];

    const duration = Math.max(0, event.endTs - event.startTs);
    const occurrences = [];
    const ruleStart = event.startTs;
    let occurrenceCount = 0;

    if (rule.freq === 'WEEKLY' && Array.isArray(rule.byday) && rule.byday.length) {
      const base = new Date(ruleStart);
      const baseDayStart = startOfDay(ruleStart);
      const baseDayIndex = base.getDay();
      const timeOffset = ruleStart - baseDayStart;
      let weekAnchor = baseDayStart - (baseDayIndex * DAY_MS);
      let safety = 0;
      while (safety < MAX_OCCURRENCES) {
        safety += 1;
        for (const code of rule.byday) {
          const targetDay = WEEKDAY_INDEX.get(code);
          const startTs = weekAnchor + (targetDay * DAY_MS) + timeOffset;
          if (startTs < ruleStart) continue;
          if (rule.until && startTs > rule.until) return occurrences;
          occurrenceCount += 1;
          if (rule.count && occurrenceCount > rule.count) return occurrences;
          if (startTs > toTs) return occurrences;
          const endTs = startTs + duration;
          if (endTs >= fromTs && startTs <= toTs) {
            occurrences.push(decorateEvent(event, startTs, endTs));
          }
        }
        weekAnchor += DAY_MS * 7 * rule.interval;
      }
      return occurrences;
    }

    let currentStart = ruleStart;
    let safety = 0;
    while (safety < MAX_OCCURRENCES) {
      safety += 1;
      if (rule.until && currentStart > rule.until) break;
      occurrenceCount += 1;
      if (rule.count && occurrenceCount > rule.count) break;
      if (currentStart > toTs) break;
      const currentEnd = currentStart + duration;
      if (currentEnd >= fromTs && currentStart <= toTs) {
        occurrences.push(decorateEvent(event, currentStart, currentEnd));
      }
      const nextStart = shiftOccurrence(currentStart, rule.freq, rule.interval);
      if (nextStart <= currentStart) break;
      currentStart = nextStart;
    }
    return occurrences;
  }

  function decorateEvent(event, startTs = event.startTs, endTs = event.endTs) {
    return {
      id: event.id,
      title: event.title,
      description: event.description || '',
      startTs,
      endTs,
      allDay: Boolean(event.allDay),
      color: event.color || '#55FF55',
      eventType: event.eventType || '',
      recurrenceRule: normalizeRule(event.recurrenceRule),
      calendarId: event.calendarId || 'family',
      createdBy: event.createdBy || 'local-user',
      createdByName: event.createdByName || DEFAULT_CREATOR,
      updatedAt: event.updatedAt || event.createdAt || Date.now(),
      updatedByName: event.updatedByName || event.createdByName || DEFAULT_CREATOR,
      isRecurring: Boolean(event.recurrenceRule)
    };
  }

  function listEvents(fromTs, toTs, calendarId) {
    const events = loadEvents();
    const output = [];
    for (const event of events) {
      if (calendarId && event.calendarId !== calendarId) continue;
      if (event.recurrenceRule) {
        output.push(...expandRecurringEvent(event, fromTs, toTs));
      } else {
        const decorated = decorateEvent(event);
        if (decorated.endTs >= fromTs && decorated.startTs <= toTs) {
          output.push(decorated);
        }
      }
    }
    output.sort((a, b) => a.startTs - b.startTs || a.title.localeCompare(b.title));
    return output;
  }

  function escapeIcsText(value) {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  }

  function formatIcsDate(ts, allDay) {
    const date = new Date(ts);
    if (allDay) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}${m}${d}`;
    }
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mm = String(date.getUTCMinutes()).padStart(2, '0');
    const ss = String(date.getUTCSeconds()).padStart(2, '0');
    return `${y}${m}${d}T${hh}${mm}${ss}Z`;
  }

  function buildRrule(rule) {
    const normalized = normalizeRule(rule);
    if (!normalized) return '';
    const parts = [`FREQ=${normalized.freq}`];
    if (normalized.interval && normalized.interval !== 1) parts.push(`INTERVAL=${normalized.interval}`);
    if (normalized.byday && normalized.byday.length) parts.push(`BYDAY=${normalized.byday.join(',')}`);
    if (normalized.until) parts.push(`UNTIL=${formatIcsDate(normalized.until, false)}`);
    if (normalized.count) parts.push(`COUNT=${normalized.count}`);
    return parts.join(';');
  }

  function buildIcs(events) {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Naimean//Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];
    const stamp = formatIcsDate(Date.now(), false);
    events.forEach((event) => {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${escapeIcsText(event.id)}@naimean-v3`);
      lines.push(`DTSTAMP:${stamp}`);
      if (event.allDay) {
        lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(event.startTs, true)}`);
        const inclusiveEnd = event.endTs > event.startTs ? event.endTs + DAY_MS : event.startTs + DAY_MS;
        lines.push(`DTEND;VALUE=DATE:${formatIcsDate(inclusiveEnd, true)}`);
      } else {
        lines.push(`DTSTART:${formatIcsDate(event.startTs, false)}`);
        lines.push(`DTEND:${formatIcsDate(event.endTs, false)}`);
      }
      lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
      if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
      const rrule = buildRrule(event.recurrenceRule);
      if (rrule) lines.push(`RRULE:${rrule}`);
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR', '');
    return lines.join('\r\n');
  }

  function getCalendarIcsText() {
    return buildIcs(loadEvents());
  }

  async function getCalendarEvents(from, to, calendarId) {
    await initCalendarSync();
    const fromTs = Number(from);
    const toTs = Number(to);
    return jsonResponse({ events: listEvents(fromTs, toTs, calendarId) });
  }

  async function createCalendarEvent(data) {
    try {
      const events = loadEvents();
      const nextEvent = normalizeEvent(data);
      events.push(nextEvent);
      saveEvents(events);
      void queueCalendarMutationSync(
        () => fetch(CALENDAR_SYNC_ENDPOINT, {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(serverPayloadFromEvent(nextEvent))
        }),
        (body) => updateLocalEventUpdatedAt(nextEvent.id, body && body.updatedAt)
      );
      return jsonResponse({ ok: true, event: decorateEvent(nextEvent) });
    } catch (error) {
      return jsonResponse({ error: error.message || 'Unable to create event.' }, 400);
    }
  }

  async function patchCalendarEvent(id, data) {
    const events = loadEvents();
    const index = events.findIndex((event) => event.id === id);
    if (index === -1) {
      return jsonResponse({ error: 'Event not found.' }, 404);
    }
    try {
      const merged = normalizeEvent({ ...events[index], ...data, calendarId: events[index].calendarId }, events[index]);
      events[index] = merged;
      saveEvents(events);
      void queueCalendarMutationSync(
        () => fetch(CALENDAR_SYNC_ENDPOINT, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(serverPayloadFromEvent(merged))
        }),
        (body) => updateLocalEventUpdatedAt(merged.id, body && body.updatedAt)
      );
      return jsonResponse({ ok: true, event: decorateEvent(merged) });
    } catch (error) {
      return jsonResponse({ error: error.message || 'Unable to update event.' }, 400);
    }
  }

  async function deleteCalendarEvent(id) {
    const events = loadEvents();
    const nextEvents = events.filter((event) => event.id !== id);
    if (nextEvents.length === events.length) {
      return jsonResponse({ error: 'Event not found.' }, 404);
    }
    saveEvents(nextEvents);
    const encodedId = encodeURIComponent(id);
    void queueCalendarMutationSync(
      () => fetch(`${CALENDAR_SYNC_ENDPOINT}?id=${encodedId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
    );
    return jsonResponse({ ok: true });
  }

  async function getCalendarIcal() {
    const blob = new Blob([getCalendarIcsText()], { type: 'text/calendar; charset=utf-8' });
    return new Response(blob, {
      status: 200,
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'cache-control': 'no-store'
      }
    });
  }

  async function getCalendarIcalUrl(options = {}) {
    const blob = new Blob([getCalendarIcsText()], { type: 'text/calendar; charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    if (!options.webcal) return objectUrl;
    return objectUrl;
  }

  async function openCalendarSubscription(kind) {
    const objectUrl = await getCalendarIcalUrl();
    if (kind === 'outlook' || kind === 'google') {
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = 'naimean.ics';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
      return objectUrl;
    }
    return objectUrl;
  }

  window.NaimeanAPI = {
    getCalendarEvents,
    createCalendarEvent,
    patchCalendarEvent,
    deleteCalendarEvent,
    getCalendarIcal,
    getCalendarIcsText,
    getCalendarIcalUrl,
    openCalendarSubscription,
    initCalendarSync,
    getCalendarSyncStatus,
    subscribeCalendarSyncStatus,
    getAuthSession,
    getNotes: function () {
      return fetch('/api/notes', { credentials: 'include', cache: 'no-store' });
    },
    saveNotes: function (state) {
      return fetch('/api/notes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(state)
      });
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      calendarSyncErrored = false;
      notifyCalendarSyncStatus();
    });
    window.addEventListener('offline', () => {
      notifyCalendarSyncStatus();
    });
  }
}());
