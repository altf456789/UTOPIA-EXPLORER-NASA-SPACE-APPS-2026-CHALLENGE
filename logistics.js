/* User-configured crew/cargo/energy scenarios. Not validated human, suit or rover specifications. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof window !== 'undefined') root.UtopiaLogistics = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const EPSILON = 1e-9;
  const DEFAULTS = Object.freeze({
    mode: 'walk', crew: 2,
    food_kcal_per_person_hour: 200, food_kcal_per_kg: 3500,
    water_l_per_person_hour: 0.25, personal_gear_kg: 4, tools_kg: 3,
    carry_limit_kg: 15, rover_payload_kg: 150,
    drive_kwh_per_km: 0.35, aux_kw: 0.15, battery_kwh: 10,
    energy_reserve_percent: 20
  });
  const STOP_PROFILES = Object.freeze({
    S01: Object.freeze({ type: 'Substrate / ice-context sampling', requested_kg: 2 }),
    S02: Object.freeze({ type: 'Instrument-station collection', requested_kg: 0.5 }),
    S03: Object.freeze({ type: 'Rock-context sampling', requested_kg: 4 }),
    S04: Object.freeze({ type: 'Reconnaissance collection', requested_kg: 1 })
  });
  const RULES = {
    crew: [1, 8, 'Crew size'],
    food_kcal_per_person_hour: [0, 1500, 'Food-energy planning rate'],
    food_kcal_per_kg: [500, 8000, 'Food energy density'],
    water_l_per_person_hour: [0, 3, 'Water planning rate'],
    personal_gear_kg: [0, 100, 'Personal gear mass'],
    tools_kg: [0, 250, 'Shared tool mass'],
    carry_limit_kg: [1, 200, 'Per-person cargo allowance'],
    rover_payload_kg: [1, 3000, 'Rover cargo allowance'],
    drive_kwh_per_km: [0, 10, 'Rover driving energy rate'],
    aux_kw: [0, 10, 'Rover auxiliary power'],
    battery_kwh: [0.1, 1000, 'Rover battery capacity'],
    energy_reserve_percent: [0, 80, 'Battery reserve percentage']
  };
  function number(value) {
    if ((typeof value !== 'number' && typeof value !== 'string') ||
        (typeof value === 'string' && value.trim() === '')) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  function validateLogistics(settings) {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return ['Enter crew and cargo assumptions.'];
    const errors = [];
    if (!['walk', 'rover'].includes(settings.mode)) errors.push('Choose walking or electric-rover transport.');
    for (const [key, [minimum, maximum, label]] of Object.entries(RULES)) {
      const value = number(settings[key]);
      if (value === null) errors.push(`${label} must be a finite number.`);
      else if (value < minimum || value > maximum) errors.push(`${label} must be between ${minimum} and ${maximum}.`);
      else if (key === 'crew' && !Number.isInteger(value)) errors.push('Crew size must be a whole number.');
    }
    if (settings.travel_allowance !== undefined) {
      const allowance = number(settings.travel_allowance);
      if (allowance === null || allowance < 1 || allowance > 5) errors.push('Travel allowance must be between 1 and 5.');
    }
    if (settings.sample_requests !== undefined) {
      if (!settings.sample_requests || typeof settings.sample_requests !== 'object' || Array.isArray(settings.sample_requests)) errors.push('Sample requests must map stop IDs to planned masses.');
      else for (const [id, raw] of Object.entries(settings.sample_requests)) {
        const value = number(raw);
        if (!STOP_PROFILES[id]) errors.push('Sample requests need known stop IDs.');
        else if (value === null || value < 0 || value > 100) errors.push(`${id} requested sample mass must be between 0 and 100 kg.`);
      }
    }
    return errors;
  }
  function planLogistics(missionResult, selectedStops, settings) {
    const errors = validateLogistics(settings);
    if (errors.length) throw new Error(errors.join(' '));
    const hours = number(missionResult?.total_hours), distance = number(missionResult?.total_km);
    if (hours === null || distance === null || hours < 0 || distance < 0) throw new Error('A mission needs finite nonnegative duration and round-trip distance.');
    if (!Array.isArray(selectedStops)) throw new Error('Selected stops must be an array.');
    const c = { mode: settings.mode, ...Object.fromEntries(Object.keys(RULES).map(key => [key, Number(settings[key])])),
      travel_allowance: settings.travel_allowance === undefined ? 1 : Number(settings.travel_allowance) };
    const ids = new Set();
    const requests = selectedStops.map(stop => {
      if (!stop || typeof stop.id !== 'string' || !STOP_PROFILES[stop.id]) throw new Error('A selected stop needs a known illustrative collection profile.');
      if (ids.has(stop.id)) throw new Error('Collect at each stop only once; duplicate stops are not allowed.');
      ids.add(stop.id);
      const profile = STOP_PROFILES[stop.id];
      const override = settings.sample_requests && Object.hasOwn(settings.sample_requests, stop.id) ? settings.sample_requests[stop.id] : stop.requested_sample_kg;
      const requested = override === undefined ? profile.requested_kg : number(override);
      if (requested === null || requested < 0 || requested > 100) throw new Error('Requested sample mass must be between 0 and 100 kg.');
      return { id: stop.id, name: String(stop.name || stop.id), type: profile.type, requested_kg: requested, allocated_kg: 0 };
    });
    const active = requests.length > 0;
    const planningHours = active ? hours : 0;
    const foodKcal = c.crew * planningHours * c.food_kcal_per_person_hour;
    const foodKg = foodKcal / c.food_kcal_per_kg;
    const waterL = c.crew * planningHours * c.water_l_per_person_hour;
    const personalGear = active ? c.crew * c.personal_gear_kg : 0;
    const tools = active ? c.tools_kg : 0;
    const supplies = personalGear + tools + foodKg + waterL;
    const capacity = c.mode === 'rover' ? c.rover_payload_kg : c.crew * c.carry_limit_kg;
    const collectionCapacity = Math.max(0, capacity - supplies);
    const requested = requests.reduce((sum, stop) => sum + stop.requested_kg, 0);
    const fraction = requested > 0 ? Math.min(1, collectionCapacity / requested) : 1;
    let remaining = collectionCapacity;
    for (const stop of requests) {
      stop.allocated_kg = Math.max(0, Math.min(stop.requested_kg * fraction, remaining));
      remaining = Math.max(0, remaining - stop.allocated_kg);
    }
    let allocated = requests.reduce((sum, stop) => sum + stop.allocated_kg, 0);
    // Remove only floating-point overflow, never allow the reported collection to exceed available mass.
    if (allocated > collectionCapacity) {
      const last = requests.slice().reverse().find(stop => stop.allocated_kg > 0);
      if (last) last.allocated_kg = Math.max(0, last.allocated_kg - (allocated - collectionCapacity));
      allocated = Math.min(collectionCapacity, requests.reduce((sum, stop) => sum + stop.allocated_kg, 0));
    }
    for (const stop of requests) stop.shortfall_kg = Math.max(0, stop.requested_kg - stop.allocated_kg);
    const first = missionResult?.outbound_points?.[0];
    const base = { id: String(first?.id || 'BASE'), name: String(first?.name || 'Base') };
    const visits = [base, ...requests];
    const legs = [];
    let collected = 0;
    if (active) {
      for (let index = 1; index < visits.length; index++) {
        legs.push({ from: visits[index - 1].id, to: visits[index].id, phase: 'outbound', samples_kg: collected, total_load_kg: supplies + collected });
        collected += visits[index].allocated_kg;
      }
      for (let index = visits.length - 1; index > 0; index--) {
        legs.push({ from: visits[index].id, to: visits[index - 1].id, phase: 'return', samples_kg: allocated, total_load_kg: supplies + allocated });
      }
    }
    let energy = null;
    if (c.mode === 'rover') {
      const drive = active ? distance * c.travel_allowance * c.drive_kwh_per_km : 0;
      const auxiliary = planningHours * c.aux_kw;
      const operational = drive + auxiliary;
      const requiredBattery = operational / (1 - c.energy_reserve_percent / 100);
      energy = {
        drive_kwh: drive, auxiliary_kwh: auxiliary, operational_kwh: operational,
        reserve_percent: c.energy_reserve_percent, required_battery_kwh: requiredBattery,
        battery_kwh: c.battery_kwh, margin_kwh: c.battery_kwh - requiredBattery,
        battery_overrun: requiredBattery > c.battery_kwh + EPSILON
      };
    }
    const numericResults = [planningHours, foodKcal, foodKg, waterL, supplies, requested, allocated, ...(energy ? Object.values(energy).filter(value => typeof value === 'number') : [])];
    if (!numericResults.every(Number.isFinite)) throw new Error('Mission demands exceed the supported numeric range.');
    return {
      mode: c.mode, crew: c.crew, planning_hours: planningHours,
      food_kcal: foodKcal, food_kg: foodKg, water_l: waterL, water_kg: waterL,
      personal_gear_kg: personalGear, tools_kg: tools, supplies_kg: supplies,
      payload_limit_kg: capacity, collection_capacity_kg: collectionCapacity,
      sample_requested_kg: requested, sample_allocated_kg: allocated, shortfall_kg: Math.max(0, requested - allocated),
      peak_requested_kg: supplies + requested, peak_allocated_kg: supplies + allocated,
      payload_margin_kg: capacity - supplies - allocated,
      requested_payload_margin_kg: capacity - supplies - requested,
      payload_overrun: supplies + requested > capacity + EPSILON,
      supplies_over_capacity: supplies > capacity + EPSILON,
      collection_limited: allocated < requested - EPSILON,
      stop_allocations: requests, load_legs: legs, energy,
      assumptions: [
        'All consumption coefficients, cargo allowances and collection requests are user-configured scenarios, not validated NASA rover, spacesuit or physiological specifications.',
        'Provisioning covers the full mission budget including the configured time contingency. It estimates carried food energy, not safe access to food or water in a suit.',
        'Water mass uses 1 kg/L. Personal gear and shared tools exclude astronaut body mass and suits; rover payload is cargo allowance excluding occupants and suits.',
        'Peak cargo retains all departure supplies and adds collected samples; no credit is taken for consumed supplies. This conservative mass budget is not a biomechanical lifting or force limit.',
        'Sample requests are illustrative planned collections; no material, outcrop or local water ice is confirmed. Insufficient collection capacity scales requests proportionally.',
        'Electric-rover driving energy uses round-trip surface distance multiplied by the travel allowance; auxiliary power covers the full mission budget. Battery reserve is a fraction of pack capacity. No validated terrain, payload, thermal, regenerative-braking or battery-aging model is included.'
      ]
    };
  }
  return { DEFAULTS, STOP_PROFILES, validateLogistics, planLogistics };
}));
