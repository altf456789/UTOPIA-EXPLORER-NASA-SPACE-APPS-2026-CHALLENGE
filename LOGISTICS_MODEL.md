# Crew, cargo and electric-rover planning

This is an educational scenario model. The source maps remain actual NASA/USGS products; **the crew, rover, supplies and collection coefficients below are user assumptions, not NASA observations or validated equipment specifications**. EVA means an extravehicular activity. A rover is an optional surface-transport vehicle.

## Planning horizon and transport

The resource model uses the full calculated mission time: outbound and return travel, science stops, and the configured time contingency. Walking and electric-rover modes use separate, editable travel-speed scenarios. The same conceptual Mars great-circle route and exact return retrace are used. Switching modes changes the transport scenario; it does not verify terrain traversability or the suitability of a vehicle.

Walking speeds can be entered from 0.5 to 6 km/h; rover speeds from 0.5 to 25 km/h. These software input ranges are not certified operating envelopes. Default speeds are 3 and 5 km/h respectively.

## Food, water and departure supplies

```text
packed food energy (kcal) = crew × total mission hours × ration allowance (kcal/person/hour)
packed food mass (kg) = packed food energy / packed energy density (kcal/kg)
water volume (L) = crew × total mission hours × water allowance (L/person/hour)
water mass (kg) ≈ water volume (L), using 1 kg/L
starting supplies (kg) = personal gear per person × crew + shared tools/containers
                        + food mass + water mass
```

Food is a **packed ration allowance**, not a claim that food can be accessed or eaten during a suited walk. Water and food coefficients do not certify physiological adequacy. The model does not estimate exertion, nutritional composition, human metabolic energy, fatigue, oxygen, CO₂ scrubbing, thermal control, suit access or emergency rescue. Include packaging and storage allowances in the entered food density and carried gear/tools as appropriate; they are not automatically engineered here.

## Cargo allowance and proposed collections

Walking cargo allowance is `crew × per-person cargo allowance`. Rover cargo allowance is a separately configured **usable cargo allowance excluding occupants and worn spacesuits**. Personal carried gear also excludes the astronaut's body and worn suit. Walking capacity pools the crew allowances and assumes the load can be distributed; individual load balance is not simulated. All carrying limits are entered as mass in kg; the app does not multiply them by a Mars-gravity factor or claim a validated human lifting limit.

Illustrative requests can be edited for each selected stop:

| Stop | Proposed activity | Default requested mass |
| --- | --- | ---: |
| S01 | Substrate / ice-context research | 2 kg |
| S02 | Instrument-station collection | 0.5 kg |
| S03 | Rock-context research | 4 kg |
| S04 | Reconnaissance collection | 1 kg |

These are planned collection requests, not identified deposits, confirmed ice, recovered samples or measured material properties.

```text
spare collection capacity = max(0, cargo allowance − starting supplies)
total requested samples = sum(selected stops' requests)
allocation fraction = min(1, spare capacity / total requested), if total requested > 0
allocated at each stop = its requested mass × allocation fraction
conservative return cargo = starting supplies + all allocated samples
```

If requests do not fit, the app retains their requested values, reports the shortfall and displays a proportional allocation. **Allocation is a simple planning policy, not science prioritization or approval of a reduced collection plan.** If starting supplies alone exceed capacity, zero sample allocation does not make the mission feasible; a separate warning remains.

The load table adds a sample after its outbound collection stop, then retains all samples on every return leg. Return visits do not collect again. All starting supplies remain in the mass budget throughout; no credit is taken for consumption. This is a conservative mass check, not a detailed changing-consumables simulation.

## Electric-rover energy

Walking mode displays rover energy as not applicable. It does not treat the crew as a zero-energy system. Electric-rover mode uses kWh rather than liquid-fuel litres:

```text
driving energy = round-trip surface km × travel-time allowance × driving rate (kWh/km)
auxiliary energy = total mission hours × auxiliary power (kW)
operational energy = driving + auxiliary energy
battery required = operational energy / (1 − minimum battery reserve fraction)
```

For example, a 20% battery reserve means the operational estimate may use at most 80% of the selected full pack capacity. That reserve is distinct from time-contingency minutes. Battery, duration and cargo warnings are separate budget checks.

The allowance applied to driving distance is a conservative scenario use of the existing travel allowance; it does not create an actual detour geometry. Energy is a simple distance/time model. It does **not** model payload-dependent traction, slope, wheel slip, soft soil, thermal conditioning, battery aging, regenerative braking or a validated propulsion design. More cargo affects carrying headroom, without inventing a calibrated mass-dependent energy penalty.

## Default assumptions

- Crew: 2.
- Food: 200 kcal/person/hour at a packed density of 3,500 kcal/kg.
- Water: 0.25 L/person/hour.
- Personal carried gear: 4 kg/person; shared tools/containers: 3 kg.
- Walking cargo allowance: 15 kg/person.
- Rover usable cargo allowance: 150 kg, excluding occupants and worn suits.
- Rover: 0.35 kWh/km driving, 0.15 kW auxiliary draw, 10 kWh battery, 20% minimum battery reserve.

Every one of these values is an editable illustrative assumption. Zero ration or water allowances are permitted for scenario arithmetic; they do not demonstrate adequate provisioning. Under-budget results do not establish crew safety or authorize a mission.

## How this supports the challenge

The real orbital map supplies the setting; selected destinations determine route distance, return time, proposed collection mass and supply demand. Crew and cargo planning adds a human-needs perspective to exploration while keeping hypotheses and unvalidated engineering assumptions separate from NASA/USGS observations. The original Python ZIP is preserved as the earlier application; this newer crew/cargo model is in the hosted browser version and its source repository.
