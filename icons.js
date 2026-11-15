/* Original AI-assisted interface pictograms for Utopia Explorer.
 * These illustrate proposed mission activities; they are not observed geological
 * features, confirmed resources, hazard classifications, or official NASA symbols.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof window !== 'undefined') root.UtopiaIcons = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const labels = Object.freeze({
    BASE: 'Hypothetical habitat',
    S01: 'Ice-context research stop; local ice unconfirmed',
    S02: 'Survey instrument stop',
    S03: 'Geology sampling stop',
    S04: 'Rover reconnaissance stop',
    WALK: 'Crew walking; conceptual replay',
    ROVER: 'Electric rover; conceptual replay'
  });
  const shapes = {
    BASE: '<path d="M4.5 14a7.5 7.5 0 0 1 15 0v5h-15z"/><path d="M9.5 19v-5h5v5M4.5 14h15M12 6.5V4M10 4h4"/>',
    S01: '<path d="m12 4 6 4v8l-6 4-6-4V8zM12 4v16M6 8l12 8M18 8 6 16M6 8l6 1.5L18 8M6 16l6-1.5 6 1.5"/>',
    S02: '<rect x="7" y="5" width="10" height="6" rx="1"/><path d="M12 11v4M12 14l-5 6M12 14l5 6M12 15v5M10 8h4M17 6h2M19 4v4"/>',
    S03: '<path d="m6 18 8-9M11 7l3-3 6 5-2 3-4-3-3-2zM6 18l-2 2M13 17l3-3 4 2-1 4h-6z"/>',
    S04: '<path d="M4 14h16v3H4zM7 14V9h7l3 5M10 9V6h6M16 6V4M6 12H4M18 12h2"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
    WALK: '<circle cx="13" cy="5" r="1.8"/><path d="m11 9 3 1 2 4 3 1M11 9l-3 5-3 1M12 10l-1 5 4 5M11 15l-4 5M8 9l2-1"/>',
    ROVER: '<path d="M4 13h16v4H4zM7 13V8h8l3 5M11 8V5h5M16 5V3"/><path d="m12 10-2 4h3l-1 3"/><circle cx="7" cy="18.5" r="1.5"/><circle cx="17" cy="18.5" r="1.5"/>'
  };
  function svg(id, selected = false) {
    const key = Object.prototype.hasOwnProperty.call(shapes, id) ? id : 'S02';
    const stroke = selected ? '#fd895b' : '#f0eee5';
    const border = selected ? '#fd895b' : '#909887';
    const fill = selected ? '#30261e' : '#171b15';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="' + labels[key] + '"><title>' + labels[key] + '</title><rect x=".7" y=".7" width="22.6" height="22.6" rx="3.5" fill="' + fill + '" stroke="' + border + '" stroke-width="1.1"/><g fill="none" stroke="' + stroke + '" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">' + shapes[key] + '</g></svg>';
  }
  function dataUrl(id, selected = false) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(id, selected));
  }
  return { svg, dataUrl, labels };
}));
