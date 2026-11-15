/* Mars geometry and a scenario time budget; no operational safety clearance. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof window !== 'undefined') root.UtopiaMission = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const RADIUS_KM = 3389.5;
  const radians = degrees => degrees * Math.PI / 180;
  const degrees = radiansValue => radiansValue * 180 / Math.PI;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const wrap = longitude => ((longitude + 180) % 360 + 360) % 360 - 180;
  const rules = {
    speed: [0.5, 6, 'Walking speed'],
    maximum: [0.25, 24, 'Maximum EVA duration'],
    science: [0, 240, 'Science time'],
    reserve: [0, 240, 'Contingency reserve'],
    factor: [1, 5, 'Travel-time allowance']
  };

  function numeric(value) {
    if ((typeof value !== 'number' && typeof value !== 'string') ||
        (typeof value === 'string' && value.trim() === '')) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function coordinate(point, label) {
    if (!point || typeof point !== 'object') throw new Error(`${label} must contain latitude and longitude.`);
    const lat = numeric(point.lat), lon = numeric(point.lon);
    if (lat === null || lon === null || lat < -90 || lat > 90) {
      throw new Error(`${label} needs a finite latitude from −90° to 90° and a finite longitude.`);
    }
    return {lat, lon: wrap(lon)};
  }

  function validateConstraints(constraints) {
    if (!constraints || typeof constraints !== 'object') return ['Enter the mission parameters.'];
    if (constraints.transportMode !== undefined && !['walk', 'rover'].includes(constraints.transportMode)) return ['Choose walking or electric-rover transport.'];
    return Object.entries(rules).flatMap(([key, [minimum, maximum, name]]) => {
      if (key === 'speed' && constraints.transportMode === 'rover') { maximum = 25; name = 'Rover travel speed'; }
      const value = numeric(constraints[key]);
      if (value === null) return [`${name} must be a finite number.`];
      if (value < minimum || value > maximum) return [`${name} must be between ${minimum} and ${maximum}.`];
      return [];
    });
  }

  function distance(start, end) {
    const a = coordinate(start, 'Start'), b = coordinate(end, 'Destination');
    const dLat = radians(b.lat - a.lat), dLon = radians(wrap(b.lon - a.lon));
    const h = clamp(Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) *
      Math.cos(radians(b.lat)) * Math.sin(dLon / 2) ** 2, 0, 1);
    return 2 * RADIUS_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function mission(route, constraints) {
    const errors = validateConstraints(constraints);
    if (errors.length) throw new Error(errors.join(' '));
    if (!Array.isArray(route) || route.length === 0) throw new Error('A mission needs a starting point.');
    route.forEach((point, index) => coordinate(point, `Route point ${index + 1}`));
    const c = Object.fromEntries(Object.keys(rules).map(key => [key, Number(constraints[key])]));
    let outbound = 0;
    for (let index = 1; index < route.length; index++) outbound += distance(route[index - 1], route[index]);
    const total = 2 * outbound;
    const travel = total * c.factor / c.speed;
    const science = (route.length - 1) * c.science / 60;
    const reserve = route.length > 1 ? c.reserve / 60 : 0;
    const required = travel + science + reserve;
    const margin = c.maximum - required;
    const status = route.length === 1 ? 'no_destinations' :
      Math.abs(margin) <= 1e-9 ? 'at_limit' : margin < 0 ? 'over_budget' : 'within_budget';
    return {
      outbound_km: outbound, return_km: outbound, total_km: total,
      travel_hours: travel, science_hours: science, reserve_hours: reserve,
      total_hours: required, margin_hours: margin, status,
      outbound_points: route.map(point => ({...point})),
      return_points: route.slice().reverse().map(point => ({...point}))
    };
  }

  function greatCirclePoints(start, end, count = 32) {
    if (!Number.isInteger(count) || count < 2) throw new Error('A great-circle segment needs at least two samples.');
    const a = coordinate(start, 'Start'), b = coordinate(end, 'Destination');
    const vector = point => [Math.cos(radians(point.lat)) * Math.cos(radians(point.lon)),
      Math.cos(radians(point.lat)) * Math.sin(radians(point.lon)), Math.sin(radians(point.lat))];
    const u = vector(a), v = vector(b);
    const dot = clamp(u.reduce((sum, value, index) => sum + value * v[index], 0), -1, 1);
    let normal = v.map((value, index) => value - dot * u[index]);
    let norm = Math.hypot(...normal);
    if (norm < 1e-12 && dot > 0) {
      return Array.from({length: count}, (_, index) => index === count - 1 ? {...b} : {...a});
    }
    if (norm < 1e-12) {
      // Antipodes have infinitely many shortest arcs; choose a stable drawing plane.
      const axis = u.map(Math.abs).indexOf(Math.min(...u.map(Math.abs)));
      normal = u.map((value, index) => (index === axis ? 1 : 0) - u[axis] * value);
      norm = Math.hypot(...normal);
    }
    const basis = normal.map(value => value / norm), angle = Math.acos(dot);
    const points = Array.from({length: count}, (_, index) => {
      const theta = angle * index / (count - 1);
      const [x, y, z] = u.map((value, i) => Math.cos(theta) * value + Math.sin(theta) * basis[i]);
      return {lat: degrees(Math.atan2(z, Math.hypot(x, y))), lon: wrap(degrees(Math.atan2(y, x)))};
    });
    points[0] = {...a}; points[count - 1] = {...b};
    return points;
  }

  function routeCoordinates(route) {
    if (!Array.isArray(route)) throw new Error('Route must be an array of coordinate points.');
    if (route.length === 0) return [];
    if (route.length === 1) return [coordinate(route[0], 'Route point')];
    let result = [];
    for (let index = 1; index < route.length; index++) {
      const segment = greatCirclePoints(route[index - 1], route[index]);
      result = result.concat(index === 1 ? segment : segment.slice(1));
    }
    return result;
  }

  return {RADIUS_KM, distance, validateConstraints, mission, greatCirclePoints, routeCoordinates};
}));
