'use strict';
(() => {
  const { mission, validateConstraints, routeCoordinates } = window.UtopiaMission;
  const { DEFAULTS: crewDefaults, STOP_PROFILES, validateLogistics, planLogistics } = window.UtopiaLogistics;
  const icons = window.UtopiaIcons;
  const $ = id => document.getElementById(id);
  const base = { id: 'BASE', name: 'Utopia Base', lat: 45, lon: 110, kind: 'hypothetical' };
  const defaults = { speed: 3, maximum: 6, science: 25, reserve: 45, factor: 1.25 };
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const notes = {
    'THEMIS daytime IR': 'NASA/JPL-Caltech/ASU THEMIS. Source resolution 100 m; cached sampling ≈81 m north–south. Historical infrared brightness is not a calibrated or live temperature.',
    'Viking color mosaic': 'NASA Viking / USGS MDIM 2.1 via Mars Trek. Cached sampling ≈325 m north–south. Colorized composite; zoom adds no observational detail.',
    'MOLA elevation': 'NASA MGS MOLA MEGDR, 128 pixels/degree. Elevation in metres relative to the source areoid. Coarse, partly interpolated topography cannot resolve EVA obstacles.',
    'Regional slope': 'Derived MOLA grid-gradient slope, in degrees. Regional context, not a measurement of local walking slope or an independent observation.',
    'USGS geology': 'USGS Tanaka et al. (2014), SIM 3292, scale 1:20,000,000. Uniform eAb fill is the actual coarse mapped basin unit, not missing detail.'
  };
  let terrainGrid = null, scienceStop = 'S01';
  let maps, points, selected = ['S01'], record = null, calculated = false, ready = false;
  let animationToken = 0, frameId = 0, travellerIndex = -1, mapListenerBound = false;
  let renderVersion = 0, renderQueue = Promise.resolve(), replaying = false;
  let replayImageIndex = -1, iconImageIndices = [];
  let sampleRequests = Object.fromEntries(Object.entries(STOP_PROFILES).map(([id, profile]) => [id, profile.requested_kg]));
  let lastMode = 'walk';
  const modeSpeeds = { walk: 3, rover: 5 };
  const constraints = () => ({ ...Object.fromEntries(Object.keys(defaults).map(key => [key, $(key).value])), transportMode: $('transport').value });
  const crewSettings = () => ({ ...Object.fromEntries(Object.keys(crewDefaults).filter(key => key !== 'mode').map(key => [key, $(key).value])), mode: $('transport').value, travel_allowance: $('factor').value, sample_requests: Object.fromEntries(selected.map(id => [id, sampleRequests[id]])) });
  const chosenPoints = () => selected.map(id => points.find(p => p.id === id)).filter(Boolean);
  const route = () => [base, ...chosenPoints()];
  const clearReadout = () => {
    for (const key of ['distance', 'travel', 'budget', 'margin']) $('metric-' + key).textContent = '—';
    $('budget-breakdown').hidden = true;
    $('crew-readout').hidden = true;
    $('terrain-readout').hidden = true;
    $('terrain-status').textContent = 'Calculate the updated mission to refresh its terrain profile.';
    $('results').dataset.state = 'draft';
    delete $('results').dataset.status;
    $('results').classList.remove('reveal');
    $('step-replay').classList.remove('is-active');
    $('step-calculate').classList.remove('is-active');
  };
  function stopReplay() {
    animationToken++;
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    replaying = false;
    $('replay-status').hidden = true;
    $('replay').innerHTML = 'Replay route <span aria-hidden="true">▷</span>';
    if (travellerIndex >= 0 && ready) Plotly.restyle('map', { x: [[]], y: [[]] }, [travellerIndex]).catch(() => {});
    if (replayImageIndex >= 0 && ready) Plotly.relayout('map', { [`images[${replayImageIndex}].opacity`]: 0 }).catch(() => {});
  }
  function validateForm() {
    const errors = [...validateConstraints(constraints()), ...validateLogistics(crewSettings())];
    $('calculate').disabled = !ready || !selected.length || errors.length > 0;
    $('calculate-hint').textContent = !ready ? 'Loading your exploration area…' : !selected.length ? 'Select a stop here or on the map.' : errors.length ? errors[0] : calculated ? 'Try another stop, or replay your mission.' : 'Ready when you are. Run the numbers.';
    return errors;
  }
  function invalidate(message = 'Mission changed. Calculate again to update.') {
    stopReplay();
    calculated = false;
    record = null;
    $('export').disabled = true;
    $('replay').disabled = true;
    clearReadout();
    $('results-title').textContent = 'Your route. Your next calculation.';
    $('status').textContent = selected.length ? message : 'No destination selected. Choose a science stop.';
    validateForm();
  }
  function renderSelections() {
    const tinyNames = { S01: 'REGIONAL ICE QUESTION', S02: 'ORBITAL TOPOGRAPHY', S03: 'BASIN-UNIT CONTEXT', S04: 'LONGER MISSION' };
    $('destinations').innerHTML = points.map(point => {
      const checked = selected.includes(point.id);
      return `<button class="destination-card" data-stop="${point.id}" aria-pressed="${checked}" aria-label="${checked ? 'Remove' : 'Add'} ${point.id}, ${point.name}"><span class="destination-icon" aria-hidden="true">${icons.svg(point.id, checked)}</span><span><span class="destination-name">${point.name}</span><span class="destination-meta">${tinyNames[point.id]}</span></span><span class="destination-check" aria-hidden="true">${checked ? '✓' : '+'}</span></button>`;
    }).join('');
    $('stop-count').textContent = String(selected.length).padStart(2, '0');
    $('itinerary').innerHTML = selected.length ? `<li><span class="sequence-number">↗</span><span class="sequence-name">Utopia Base</span></li>` + chosenPoints().map((point, index) => `<li><span class="sequence-number">${String(index + 1).padStart(2, '0')}</span><span class="sequence-name">${point.id} / ${point.name}</span><button data-move="-1" data-id="${point.id}" aria-label="Move ${point.id} earlier" ${index === 0 ? 'disabled' : ''}>↑</button><button data-move="1" data-id="${point.id}" aria-label="Move ${point.id} later" ${index === selected.length - 1 ? 'disabled' : ''}>↓</button></li>`).join('') : '<li class="empty-route">Your first stop goes here.</li>';
    const c = constraints();
    $('parameter-summary').textContent = `${$('transport').value === 'rover' ? 'Rover' : 'On foot'} · ${c.speed || '—'} km/h · ${$('crew').value || '—'} crew · ${c.maximum || '—'} h limit`;
    renderSampleRequests();
    renderScienceBrief();
  }
  function renderSampleRequests() {
    $('sample-requests').innerHTML = selected.length ? chosenPoints().map(point => `<div class="sample-input-row"><label for="sample-${point.id}">${point.id} · ${point.name}<small>${STOP_PROFILES[point.id].type} · kg</small></label><input id="sample-${point.id}" data-sample="${point.id}" type="number" min="0" max="100" step="any" value="${sampleRequests[point.id]}" required></div>`).join('') : '<p class="small-note">Choose a destination to plan a collection.</p>';
  }
  function renderTransport() {
    const rover = $('transport').value === 'rover';
    $('walk-capacity').hidden = rover;
    $('rover-settings').hidden = !rover;
    $('speed-label').textContent = rover ? 'Rover travel speed' : 'Walking speed';
    $('speed').max = rover ? '25' : '6';
  }
  function toggleStop(id) {
    if (!ready || !points.some(p => p.id === id)) return;
    scienceStop = id;
    selected = selected.includes(id) ? selected.filter(key => key !== id) : [...selected, id];
    invalidate();
    renderSelections();
    renderMap();
  }
  function renderMap() {
    const version = ++renderVersion;
    // Serialize Plotly changes so an older layer request cannot overwrite a newer route.
    renderQueue = renderQueue.catch(() => {}).then(async () => {
      if (version !== renderVersion) return;
      const layer = $('layer').value;
      const figure = structuredClone(maps[layer]);
      const coords = routeCoordinates(route());
      const marked = figure.data.find(trace => trace.name === 'Hypothetical destinations');
      if (marked) {
        marked.marker = { symbol: 'square', size: 32, color: 'rgba(0,0,0,0.002)', line: { width: 0 } };
        marked.textfont = { family: 'IBM Plex Mono', size: 11, color: '#f0eee5' };
      }
      const habitat = figure.data.find(trace => trace.name === 'Hypothetical habitat');
      if (habitat) habitat.marker = { symbol: 'square', size: 34, color: 'rgba(0,0,0,0.002)', line: { width: 0 } };
      const span = $('map').layout?.xaxis?.range ? Math.abs($('map').layout.xaxis.range[1] - $('map').layout.xaxis.range[0]) : .32;
      const iconWidth = span * .055, iconHeight = iconWidth * Math.cos(base.lat * Math.PI / 180);
      figure.layout.images = figure.layout.images || [];
      iconImageIndices = [];
      for (const point of [base, ...points]) {
        iconImageIndices.push(figure.layout.images.length);
        figure.layout.images.push({ source: icons.dataUrl(point.id, point.id === 'BASE' || selected.includes(point.id)), xref: 'x', yref: 'y', x: point.lon, y: point.lat, sizex: iconWidth, sizey: iconHeight, xanchor: 'center', yanchor: 'middle', sizing: 'contain', layer: 'above' });
      }
      replayImageIndex = figure.layout.images.length;
      figure.layout.images.push({ source: icons.dataUrl($('transport').value === 'rover' ? 'ROVER' : 'WALK', true), xref: 'x', yref: 'y', x: base.lon, y: base.lat, sizex: iconWidth, sizey: iconHeight, xanchor: 'center', yanchor: 'middle', sizing: 'contain', layer: 'above', opacity: 0 });
      for (const [name, color, dash, width] of [
        ['Outbound · conceptual', '#fd895b', calculated ? 'solid' : 'dot', 4],
        ['Return · same path', '#a1ccd0', 'dash', 1.8]
      ]) {
        if (coords.length > 1) figure.data.push({ type: 'scatter', mode: 'lines', x: coords.map(p => p.lon), y: coords.map(p => p.lat), name, line: { color, dash, width }, opacity: calculated ? 1 : .6, hoverinfo: 'skip' });
      }
      travellerIndex = figure.data.length;
      figure.data.push({ type: 'scatter', mode: 'markers', x: [], y: [], name: 'Conceptual replay marker', marker: { color: 'rgba(0,0,0,0)', size: 1 }, hoverinfo: 'skip', showlegend: false });
      Object.assign(figure.layout, {
        autosize: true, height: Math.max($('map').parentElement.clientHeight || 0, window.innerWidth <= 480 ? 460 : window.innerWidth <= 760 ? 480 : window.innerWidth >= 1450 ? 575 : 535),
        paper_bgcolor: '#141610', plot_bgcolor: '#141610', showlegend: false,
        font: { family: 'IBM Plex Mono', color: '#d2d6c9', size: 10 },
        margin: { l: 64, r: layer.includes('MOLA') || layer.includes('slope') ? 60 : 20, t: 48, b: 55 },
        uirevision: 'utopia-study-area'
      });
      delete figure.layout.width;
      figure.layout.xaxis.gridcolor = 'rgba(230,233,219,.1)';
      figure.layout.yaxis.gridcolor = 'rgba(230,233,219,.1)';
      await Plotly.react('map', figure.data, figure.layout, { responsive: true, displaylogo: false, scrollZoom: true, modeBarButtonsToRemove: ['select2d', 'lasso2d'] });
      if (version !== renderVersion) return;
      $('layer-note').textContent = notes[layer];
      if (!mapListenerBound) {
        $('map').on('plotly_click', event => {
          const point = event.points?.find(p => p.data?.name === 'Hypothetical destinations');
          if (point && points[point.pointIndex ?? point.pointNumber]) toggleStop(points[point.pointIndex ?? point.pointNumber].id);
        });
        $('map').on('plotly_relayout', event => {
          const low = event['xaxis.range[0]'] ?? event['xaxis.range']?.[0];
          const high = event['xaxis.range[1]'] ?? event['xaxis.range']?.[1];
          if (!Number.isFinite(low) || !Number.isFinite(high)) return;
          const width = Math.abs(high - low) * .055;
          const update = {};
          for (const index of [...iconImageIndices, replayImageIndex]) {
            update[`images[${index}].sizex`] = width;
            update[`images[${index}].sizey`] = width * Math.cos(base.lat * Math.PI / 180);
          }
          Plotly.relayout('map', update).catch(() => {});
        });
        mapListenerBound = true;
      }
      return true;
    }).catch(error => {
      $('map-loading').hidden = false;
      $('map-loading').textContent = 'Map could not render. Reload the page to try again.';
      $('status').textContent = error.message;
      return false;
    });
    return renderQueue;
  }
  function showNumber(id, value, unit) {
    $(id).innerHTML = `${value.toFixed(2)}<em>${unit}</em>`;
  }
  function renderCrewReadout(load) {
    const rover = load.mode === 'rover';
    $('crew-readout').hidden = false;
    $('transport-result').innerHTML = `${icons.svg(rover ? 'ROVER' : 'WALK', true)} ${rover ? 'Electric rover' : 'Walking EVA'} / ${load.crew} crew`;
    if (rover) {
      showNumber('resource-energy', load.energy.required_battery_kwh, 'kWh');
      $('energy-detail').textContent = `${load.energy.operational_kwh.toFixed(2)} kWh operational + ${load.energy.reserve_percent}% battery reserve; ${load.energy.battery_kwh.toFixed(2)} kWh available.`;
    } else {
      $('resource-energy').textContent = 'Not used';
      $('energy-detail').textContent = 'Walking mode has no rover-energy estimate. Human energy expenditure is not modeled.';
    }
    showNumber('resource-food', load.food_kg, 'kg');
    $('food-detail').textContent = `${load.food_kcal.toFixed(0)} kcal packed for ${load.crew} crew across ${load.planning_hours.toFixed(2)} h, including time contingency.`;
    showNumber('resource-water', load.water_l, 'L');
    $('water-detail').textContent = `${load.water_kg.toFixed(2)} kg of water; packed supply estimate, not a physiological guarantee.`;
    showNumber('resource-load', load.peak_allocated_kg, 'kg');
    $('load-detail').textContent = `Of ${load.payload_limit_kg.toFixed(2)} kg cargo allowance. ${load.supplies_kg.toFixed(2)} kg supplies + ${load.sample_allocated_kg.toFixed(2)} kg samples.`;
    const warnings = [];
    if (load.supplies_over_capacity) warnings.push(`SUPPLIES EXCEED CARGO ALLOWANCE by ${(load.supplies_kg - load.payload_limit_kg).toFixed(2)} kg, before any collection. Reduce the packed load or revise the transport scenario.`);
    if (load.collection_limited) warnings.push(`COLLECTION SHORTFALL: ${load.shortfall_kg.toFixed(2)} kg of the requested samples does not fit. The table shows a proportional allocation, not the complete collection plan.`);
    if (load.energy?.battery_overrun) warnings.push(`BATTERY SHORTFALL: ${(-load.energy.margin_kwh).toFixed(2)} kWh below the estimated requirement including the configured reserve.`);
    $('resource-warnings').innerHTML = warnings.map(message => `<li>${message}</li>`).join('');
    $('collection-summary').textContent = `${load.sample_requested_kg.toFixed(2)} kg requested across ${load.stop_allocations.length} ${load.stop_allocations.length === 1 ? 'stop' : 'stops'}. ${load.collection_capacity_kg.toFixed(2)} kg available after packed supplies; ${load.sample_allocated_kg.toFixed(2)} kg allocated to the return collection.`;
    $('sample-allocation').innerHTML = load.stop_allocations.map(stop => `<tr><td>${stop.id} / ${stop.name}<small>${stop.type} · hypothetical request</small></td><td>${stop.requested_kg.toFixed(3)} kg</td><td class="${stop.shortfall_kg > 1e-9 ? 'collection-shortfall' : ''}">${stop.allocated_kg.toFixed(3)} kg${stop.shortfall_kg > 1e-9 ? `<small>${stop.shortfall_kg.toFixed(3)} kg shortfall</small>` : ''}</td></tr>`).join('');
    $('load-legs').innerHTML = load.load_legs.map(leg => `<tr><td>${leg.phase === 'outbound' ? 'Outbound' : 'Return'} / ${leg.from} → ${leg.to}</td><td>${leg.samples_kg.toFixed(3)} kg</td><td>${leg.total_load_kg.toFixed(3)} kg</td></tr>`).join('');
  }
  const scienceQuestions = {
    S01: { question: 'Could local reconnaissance help test an ice-related hypothesis motivated by regional radar research?', observations: ['Photograph surface textures and record a georeferenced field description.', 'Plan a suitable ground-radar or subsurface investigation before considering a substrate collection.'], unknowns: 'No georeferenced ice-deposit footprint has been matched to this stop. Ice presence, depth, purity and extractability here are unknown.' },
    S02: { question: 'How well does the coarse orbital elevation grid describe terrain that a crew would encounter on the ground?', observations: ['Measure local relief with a field survey and compare it with the MOLA grid estimate.', 'Document obstacles and steep patches that orbital sampling may miss.'], unknowns: 'Local slopes, surface roughness, trafficability and instrument placement have not been surveyed.' },
    S03: { question: 'What field observations could test the regional interpretation of this area as a basin unit?', observations: ['Record visible layering, grain size and rock context where accessible material is actually found.', 'Document sample context before proposing any geological collection.'], unknowns: 'No outcrop, lithology, rock composition or accessible sample material has been confirmed at this illustrative coordinate.' },
    S04: { question: 'What extra scientific context might a longer reconnaissance traverse provide, and what field checks would it require?', observations: ['Photograph the traverse corridor and log changes in surface texture and relief.', 'Use a reconnaissance survey to identify possible future science targets and obstacles.'], unknowns: 'No traversable corridor, additional discovery or suitable rover path has been confirmed. Longer range also increases the return and supply budget.' }
  };
  function renderScienceBrief() {
    if (!points) return;
    const point = points.find(p => p.id === scienceStop) || points[0];
    const brief = scienceQuestions[point.id];
    $('science-stop').value = point.id;
    const elevation = window.UtopiaTerrain.sample(terrainGrid, point.lat, point.lon);
    const slope = window.UtopiaTerrain.sample(terrainGrid, point.lat, point.lon, 'slope_degrees');
    const estimate = elevation === null ? 'MOLA grid estimates are unavailable at this coordinate.' : `MOLA grid elevation estimate: ${elevation.toFixed(0)} m relative to the source areoid${slope === null ? '' : `; derived regional grid slope: ${slope.toFixed(2)} degrees`}. These are interpolated orbital-grid values, not ground measurements at this stop.`;
    $('science-brief').innerHTML = `<div class="brief-intro">${icons.svg(point.id, selected.includes(point.id))}<div><h3>${point.id} / ${point.name}</h3><p>HYPOTHETICAL STOP · ${point.lat.toFixed(3)}°N / ${point.lon.toFixed(3)}°E · ${selected.includes(point.id) ? 'ON YOUR ROUTE' : 'NOT SELECTED'}</p></div></div><p class="brief-question">${brief.question}</p><div class="brief-grid"><div><h4>SOURCE EVIDENCE / REGIONAL CONTEXT</h4><p>${estimate}</p><p>The checked study area is mapped as eAb, Early Amazonian basin unit, by USGS SIM 3292 at 1:20 million scale. THEMIS and Viking mosaics provide historical orbital context, not confirmed local features.</p><p><a href="https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived/meg128/megt88n090hb.xml" target="_blank" rel="noopener">MOLA source label</a> · <a href="https://pubs.usgs.gov/sim/3292/" target="_blank" rel="noopener">USGS geological map</a> · <a href="https://trek.nasa.gov/mars/" target="_blank" rel="noopener">Mars Trek imagery</a></p>${point.id === 'S01' ? '<p><a href="https://www.jpl.nasa.gov/news/mars-ice-deposit-holds-as-much-water-as-lake-superior/" target="_blank" rel="noopener">NASA/JPL SHARAD research</a> motivates the regional ice question; it does not locate ice at this stop.</p>' : ''}</div><div><h4>PROPOSED FIELD OBSERVATIONS</h4><ul>${brief.observations.map(text => `<li>${text}</li>`).join('')}</ul><h4>WHAT REMAINS UNKNOWN</h4><p>${brief.unknowns}</p></div></div><p class="brief-collection"><strong>Collection plan:</strong> ${STOP_PROFILES[point.id].type}; ${sampleRequests[point.id] === '' ? 'no valid mass entered' : `${Number(sampleRequests[point.id]).toFixed(2)} kg requested`}. This is an editable proposed collection, not a confirmed geological finding. Actual collection still requires suitable material, field assessment and available cargo capacity.</p>`;
  }
  function renderTerrainProfile() {
    const profile = window.UtopiaTerrain.profile(terrainGrid, route());
    if (record) record.terrain_profile = { ...profile, limitations: 'Coarse MOLA grid and derived regional slopes; interpolation adds no observations and cannot certify a safe path.' };
    if (!terrainGrid || !profile.points.length || profile.min_elevation_m === null) {
      $('terrain-readout').hidden = true;
      $('terrain-status').textContent = 'MOLA terrain estimates are unavailable for this route. No elevations or slopes are substituted.';
      return;
    }
    $('terrain-readout').hidden = false;
    $('terrain-status').textContent = profile.missing_count ? `${profile.missing_count} profile samples lack terrain data. Gaps are left visible; summaries use available estimates.` : 'Full round trip · elevation and grid-derived slope · return retraces the outbound route.';
    $('terrain-summary').innerHTML = `<span>Grid elevation range <b>${profile.min_elevation_m.toFixed(0)} to ${profile.max_elevation_m.toFixed(0)} m</b></span><span>Maximum sampled regional slope <b>${profile.max_regional_slope_degrees === null ? 'Unavailable' : profile.max_regional_slope_degrees.toFixed(2) + '°'}</b></span>`;
    const x = profile.points.map(p => p.distance_km);
    const traces = [{ type: 'scatter', mode: 'lines', x, y: profile.points.map(p => p.elevation_m), name: 'MOLA grid elevation', connectgaps: false, line: { color: '#f0eee5', width: 2 }, hovertemplate: '%{x:.2f} km<br>%{y:.0f} m / areoid<extra></extra>' }, { type: 'scatter', mode: 'lines', x, y: profile.points.map(p => p.slope_degrees), yaxis: 'y2', name: 'Regional grid slope', connectgaps: false, line: { color: '#fd895b', width: 2 }, hovertemplate: '%{x:.2f} km<br>%{y:.2f}° grid slope<extra></extra>' }];
    Plotly.react('terrain-chart', traces, { height: window.innerWidth < 761 ? 320 : 340, paper_bgcolor: '#181a15', plot_bgcolor: '#181a15', font: { family: 'IBM Plex Mono', size: 10, color: '#b1b4a7' }, margin: { l: 65, r: 16, t: 30, b: 48 }, showlegend: false, xaxis: { title: 'Round-trip distance · km', gridcolor: '#383b32', zeroline: false }, yaxis: { title: 'Elevation · m', domain: [.43, 1], gridcolor: '#383b32', zeroline: false }, yaxis2: { title: 'Grid slope · °', domain: [0, .24], gridcolor: '#383b32', zeroline: false, rangemode: 'tozero' }, shapes: [{ type: 'line', x0: profile.outbound_km, x1: profile.outbound_km, y0: 0, y1: 1, yref: 'paper', line: { color: '#a1ccd0', dash: 'dot', width: 1 } }], annotations: [{ x: profile.outbound_km, y: 1.08, yref: 'paper', text: 'RETURN BEGINS', showarrow: false, font: { size: 9, color: '#a1ccd0' } }] }, { responsive: true, displaylogo: false }).catch(() => { $('terrain-readout').hidden = true; $('terrain-status').textContent = 'Terrain chart could not render. No route safety assessment is available.'; });
  }
  async function calculate() {
    if (!ready || !selected.length || validateForm().length) return;
    stopReplay();
    const c = { ...Object.fromEntries(Object.keys(defaults).map(key => [key, Number($(key).value)])), transportMode: $('transport').value };
    const result = mission(route(), c);
    const logisticsSettings = crewSettings();
    const logistics = planLogistics(result, chosenPoints(), logisticsSettings);
    calculated = true;
    record = { mission: 'EVA-01', team: 'Kazakh Space Nomads', generated_utc: new Date().toISOString(), coordinate_reference: 'Mars planetocentric latitude and positive-east longitude, degrees', radius_km: 3389.5, base, destinations: chosenPoints(), constraints: c, plan: result, logistics_settings: logisticsSettings, crew_and_cargo: logistics, uncertainties: 'Hypothetical locations; conceptual minimum-distance route; all crew, cargo and energy coefficients are unvalidated scenario assumptions; local ice, hazards and life-support safety are unverified.' };
    showNumber('metric-distance', result.total_km, 'km');
    showNumber('metric-travel', result.travel_hours, 'h');
    showNumber('metric-budget', result.total_hours, 'h');
    showNumber('metric-margin', result.margin_hours, 'h');
    $('results').dataset.state = 'calculated';
    $('results').dataset.status = result.status;
    $('results-title').textContent = result.status === 'over_budget' ? 'This one needs a rethink.' : result.status === 'at_limit' ? 'Right at the limit.' : 'There and back, accounted for.';
    $('status').textContent = result.status === 'over_budget' ? `OVER DURATION BUDGET / ${(-result.margin_hours).toFixed(2)} h over the limit.` : result.status === 'at_limit' ? 'AT DURATION LIMIT / No unallocated time remains.' : `WITHIN DURATION BUDGET / ${result.margin_hours.toFixed(2)} h remains after reserve. Safety is unverified.`;
    const denominator = Math.max(c.maximum, result.total_hours);
    const parts = [result.travel_hours, result.science_hours, result.reserve_hours, Math.max(0, result.margin_hours)];
    ['travel', 'science', 'reserve', 'free'].forEach((key, i) => $('budget-' + key).style.width = `${parts[i] / denominator * 100}%`);
    $('budget-labels').innerHTML = ['Travel', 'Science', 'Reserve', 'Unallocated'].map((name, i) => `<span style="--legend-color:${['#fd895b', '#a1ccd0', '#b8ad8d', '#6d7954'][i]}">${name} ${parts[i].toFixed(2)} h</span>`).join('');
    $('budget-breakdown').hidden = false;
    renderCrewReadout(logistics);
    renderTerrainProfile();
    $('export').disabled = false;
    $('replay').disabled = false;
    $('step-calculate').classList.add('is-active');
    $('step-replay').classList.add('is-active');
    $('results').classList.remove('reveal');
    void $('results').offsetWidth;
    $('results').classList.add('reveal');
    validateForm();
    const token = animationToken;
    const rendered = await renderMap();
    if (rendered && calculated && token === animationToken && !motion.matches) startReplay();
  }
  function startReplay() {
    if (!calculated || !record || motion.matches) {
      if (motion.matches && calculated) {
        $('replay-status').hidden = false;
        $('replay-status').textContent = 'ROUTE READY · ANIMATION OFF (REDUCED MOTION)';
      }
      return;
    }
    stopReplay();
    const coords = routeCoordinates(record.plan.outbound_points);
    if (coords.length < 2) return;
    const trip = [...coords, ...coords.slice(0, -1).reverse()];
    const token = animationToken;
    replaying = true;
    $('replay').innerHTML = 'Stop replay <span aria-hidden="true">■</span>';
    $('replay-status').hidden = false;
    let lastTick = 0;
    const began = performance.now(), duration = 5600;
    const tick = now => {
      if (token !== animationToken || !calculated) return;
      const progress = Math.min(1, (now - began) / duration);
      if (now - lastTick > 75 || progress === 1) {
        const index = Math.min(trip.length - 1, Math.floor(progress * (trip.length - 1)));
        const position = trip[index];
        $('replay-status').textContent = `${progress < .5 ? 'OUTBOUND' : 'RETURN TO BASE'} · CONCEPTUAL / TIME COMPRESSED`;
        Plotly.restyle('map', { x: [[position.lon]], y: [[position.lat]] }, [travellerIndex]).catch(() => {});
        Plotly.relayout('map', { [`images[${replayImageIndex}].x`]: position.lon, [`images[${replayImageIndex}].y`]: position.lat, [`images[${replayImageIndex}].opacity`]: 1 }).catch(() => {});
        lastTick = now;
      }
      if (progress < 1) frameId = requestAnimationFrame(tick);
      else {
        replaying = false;
        frameId = 0;
        $('replay-status').textContent = 'BACK AT BASE · CONCEPTUAL REPLAY COMPLETE';
        $('replay').innerHTML = 'Replay route <span aria-hidden="true">▷</span>';
      }
    };
    frameId = requestAnimationFrame(tick);
  }
  function activateTab(id, focus = false) {
    for (const key of ['route', 'limits', 'crew']) {
      const active = key === id;
      $(key + '-tab').setAttribute('aria-selected', String(active));
      $(key + '-tab').tabIndex = active ? 0 : -1;
      $(key + '-panel').hidden = !active;
    }
    if (focus) $(id + '-tab').focus();
  }
  function bindEvents() {
    for (const key of ['route', 'limits', 'crew']) {
      $(key + '-tab').addEventListener('click', () => activateTab(key));
      $(key + '-tab').addEventListener('keydown', event => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const tabs = ['route', 'limits', 'crew'];
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(key) + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
          activateTab(tabs[next], true);
        }
      });
    }
    $('destinations').addEventListener('click', event => {
      const button = event.target.closest('[data-stop]');
      if (!button) return;
      const id = button.dataset.stop;
      toggleStop(id);
      $('destinations').querySelector(`[data-stop="${id}"]`)?.focus({ preventScroll: true });
    });
    $('itinerary').addEventListener('click', event => {
      const button = event.target.closest('[data-move]');
      if (!button || button.disabled) return;
      const index = selected.indexOf(button.dataset.id), next = index + Number(button.dataset.move);
      if (next < 0 || next >= selected.length) return;
      [selected[index], selected[next]] = [selected[next], selected[index]];
      invalidate(); renderSelections(); renderMap();
      $('itinerary').querySelector(`[data-id="${button.dataset.id}"][data-move="${button.dataset.move}"]`)?.focus({ preventScroll: true });
    });
    for (const key of Object.keys(defaults)) $(key).addEventListener('input', () => {
      invalidate(); renderSelections(); renderMap();
    });
    for (const key of Object.keys(crewDefaults).filter(key => key !== 'mode')) $(key).addEventListener('input', () => {
      invalidate(); renderSelections(); renderMap();
    });
    $('sample-requests').addEventListener('input', event => {
      const id = event.target.dataset.sample;
      if (!id) return;
      sampleRequests[id] = event.target.value;
      invalidate(); renderScienceBrief();
    });
    $('transport').addEventListener('change', () => {
      modeSpeeds[lastMode] = $('speed').value;
      lastMode = $('transport').value;
      $('speed').value = modeSpeeds[lastMode];
      renderTransport(); invalidate(); renderSelections(); renderMap();
    });
    $('science-stop').addEventListener('change', () => { scienceStop = $('science-stop').value; renderScienceBrief(); });
    $('calculate').addEventListener('click', calculate);
    $('layer').addEventListener('change', () => { stopReplay(); renderMap(); });
    $('replay').addEventListener('click', () => replaying ? stopReplay() : startReplay());
    $('focus-map').addEventListener('click', () => Plotly.relayout('map', { 'xaxis.range': [109.84, 110.16], 'yaxis.range': [44.895, 45.105] }));
    $('reset').addEventListener('click', () => {
      selected = ['S01']; scienceStop = 'S01';
      Object.entries(defaults).forEach(([key, value]) => $(key).value = value);
      Object.entries(crewDefaults).filter(([key]) => key !== 'mode').forEach(([key, value]) => $(key).value = value);
      $('transport').value = 'walk'; lastMode = 'walk'; modeSpeeds.walk = 3; modeSpeeds.rover = 5;
      sampleRequests = Object.fromEntries(Object.entries(STOP_PROFILES).map(([id, profile]) => [id, profile.requested_kg]));
      renderTransport();
      activateTab('route');
      invalidate('EVA-01 restored. Calculate when you are ready.');
      renderSelections(); renderMap();
    });
    $('export').addEventListener('click', () => {
      if (!calculated || !record) return;
      const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'EVA-01_mission_plan.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    motion.addEventListener('change', () => { if (motion.matches) stopReplay(); });
  }
  async function initialize() {
    try {
      [maps, points] = await Promise.all(['maps.json', 'points.json'].map(async path => {
        const response = await fetch(path);
        if (!response.ok) throw new Error('Bundled map data unavailable.');
        return response.json();
      }));
      try { const response = await fetch('terrain-grid.json'); const grid = response.ok ? await response.json() : null; terrainGrid = grid?.elevation_m && grid?.latitudes && grid?.longitudes ? grid : null; } catch { terrainGrid = null; }
      $('science-stop').innerHTML = points.map(point => `<option value="${point.id}">${point.id} · ${point.name}</option>`).join('');
      $('layer').innerHTML = Object.keys(maps).map(name => `<option>${name}</option>`).join('');
      bindEvents();
      ready = true;
      renderTransport();
      $('legend-habitat').innerHTML = icons.svg('BASE');
      $('legend-stations').innerHTML = ['S01', 'S02', 'S03', 'S04'].map(id => icons.svg(id)).join('');
      renderSelections();
      validateForm();
      const rendered = await renderMap();
      if (!rendered) throw new Error('The orbital map could not render. Reload to try again.');
      $('map-loading').hidden = true;
    } catch (error) {
      ready = false;
      $('map-loading').textContent = 'Unable to load the exploration area. Reload to try again.';
      $('status').textContent = error.message;
      $('calculate-hint').textContent = 'Map data unavailable. Please reload.';
      $('calculate').disabled = true;
    }
  }
  initialize();
})();
