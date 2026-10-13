(function attachHtmlSafety(root) {
    'use strict';

    function escapeHtml(value) {
        var entities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return entities[character];
        });
    }

    function highlightHtml(value, searchTerm) {
        var text = String(value == null ? '' : value);
        var query = String(searchTerm == null ? '' : searchTerm);
        if (!query) return escapeHtml(text);

        var lowerText = text.toLowerCase();
        var lowerQuery = query.toLowerCase();
        var chunks = [];
        var cursor = 0;
        var matchIndex;

        while ((matchIndex = lowerText.indexOf(lowerQuery, cursor)) !== -1) {
            chunks.push(escapeHtml(text.slice(cursor, matchIndex)));
            chunks.push('<span class="highlight">' + escapeHtml(text.slice(matchIndex, matchIndex + query.length)) + '</span>');
            cursor = matchIndex + query.length;
        }
        chunks.push(escapeHtml(text.slice(cursor)));
        return chunks.join('');
    }

    var api = Object.freeze({ escapeHtml: escapeHtml, highlightHtml: highlightHtml });
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.KomodoHtmlSafety = api;
})(typeof window !== 'undefined' ? window : globalThis);
