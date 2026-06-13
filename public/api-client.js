(function () {
  'use strict';

  window.NaimeanAPI = {
    getAuthSession: function () {
      return fetch('/api/discord/me', { credentials: 'include', cache: 'no-store' });
    },
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
}());
