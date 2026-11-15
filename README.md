
# Utopia Explorer — Mars EVA Mission Planner

[![Open Website](https://img.shields.io/badge/🌐%20Open%20Website-Click%20Here-orange?style=for-the-badge)](https://fantastic-smakager-4fedaf.netlify.app/)

**NASA Space Apps Challenge 2026 · Interplanetary Survival Guide: Martian Map**

**Team: Kazakh Astro Nomads**

*From the Great Steppe to the Stars.*

---

## About the Project

**Utopia Explorer** is an interactive Mars surface exploration and EVA (Extravehicular Activity) mission-planning application developed for the NASA Space Apps Challenge 2026.

The project focuses on **Utopia Planitia**, a region in the northern lowlands of Mars that has been investigated for its geological characteristics and potential subsurface water ice.

Inspired by our earlier research into establishing a sustainable human settlement on Mars, Utopia Explorer transforms scientific information into an interactive tool for planning hypothetical astronaut expeditions.

The goal is simple: **help future explorers understand where they are going, what they might encounter, and whether their planned mission fits within its operational constraints.**

---

## What Does Utopia Explorer Do?

Utopia Explorer combines real NASA and USGS planetary datasets with interactive mission-planning tools.

Users can select scientific destinations, construct exploration routes, calculate mission requirements, examine terrain information, and evaluate potential operational constraints.

### Key Features

| Feature | Description |
|---------|-------------|
| Interactive Mars Map | Explore Utopia Planitia using NASA-derived orbital imagery |
| EVA Route Planning | Select and reorder scientific waypoints and visualize outbound and return routes |
| Distance Calculation | Calculate approximate surface distances using Mars's planetary radius |
| Mission Time Estimation | Estimate travel time, scientific activity time, and contingency reserves |
| Terrain Analysis | Examine elevation profiles derived from NASA MOLA topographic data |
| Geological Information | Explore regional geological context using USGS mapping |
| Crew & Cargo Planning | Estimate supplies, equipment mass, and sample-carrying capacity |
| Rover Energy Planning | Estimate battery consumption using configurable mission assumptions |
| Scientific Waypoints | Explore proposed locations associated with geological and water-ice research questions |
| Mission Replay | Visualize the planned outbound and return journey |
| JSON Export | Export mission configurations and calculated results |

---

## How to Use

### 1. Open the Application

[![Launch Utopia Explorer](https://img.shields.io/badge/Launch-Utopia%20Explorer-orange?style=for-the-badge)](https://fantastic-smakager-4fedaf.netlify.app/)

The hosted application runs directly in a modern web browser.

### 2. Plan Your Route

- Explore the interactive map of Utopia Planitia.
- Select scientific waypoints.
- Arrange destinations in your preferred visiting order.
- Review the proposed outbound and return route.

### 3. Configure Your Mission

Adjust mission parameters, including:

- Walking speed
- Maximum EVA duration
- Scientific activity time
- Contingency reserve
- Crew size
- Cargo capacity
- Water and food allowances
- Rover battery capacity and energy consumption

### 4. Calculate Your Mission

Click **Calculate Mission** to generate estimates for:

- Round-trip distance
- Travel time
- Total EVA duration
- Remaining mission time
- Supply requirements
- Cargo allocation
- Rover energy requirements

### 5. Analyze the Terrain

Review the elevation profile and available geological information to better understand the proposed exploration region.

### 6. Export Your Results

Download the mission configuration and calculations as a JSON file.

---

## Scientific Data Sources

Utopia Explorer uses publicly available planetary datasets and scientific references.

| Source | Purpose |
|--------|---------|
| NASA JPL Mars Trek | Orbital imagery and planetary mapping |
| NASA Mars Global Surveyor / MOLA | Gridded elevation and regional terrain analysis |
| USGS Planetary Geologic Mapping Program | Geological classification and regional geological context |
| NASA/JPL SHARAD Research | Scientific background on potential buried water ice in Utopia Planitia |
| NASA THEMIS and Viking MDIM | Orbital imagery of the Martian surface |

### Official Resources

- [NASA Mars Trek](https://trek.nasa.gov/mars/)
- [NASA Planetary Data System](https://pds.nasa.gov/)
- [USGS Planetary Geologic Mapping](https://planetarymapping.wr.usgs.gov/)
- [NASA Jet Propulsion Laboratory](https://www.jpl.nasa.gov/)

Scientific observations are distinguished from hypothetical mission locations and configurable simulation parameters.

---

## How the Mission Planner Works

```text
          NASA / USGS DATA
                 |
                 v
        INTERACTIVE MARS MAP
                 |
                 v
       SELECT SCIENCE WAYPOINTS
                 |
                 v
          BUILD EVA ROUTE
                 |
                 v
        CONFIGURE PARAMETERS
                 |
                 v
       MISSION CALCULATION
                 |
       +---------+---------+
       |         |         |
       v         v         v
    DISTANCE   TIME     RESOURCES
       |         |         |
       +---------+---------+
                 |
                 v
        MISSION SAFETY SUMMARY
                 |
                 v
       TERRAIN PROFILE / REPLAY
                 |
                 v
           EXPORT JSON
```

### Route Calculations

Surface distances are calculated using spherical geometry and the mean radius of Mars:

**R = 3,389.5 km**

The planner estimates total mission duration using outbound travel, return travel, scientific activities, and configurable contingency allowances.

These calculations provide preliminary mission-planning estimates rather than verified navigation instructions.

---

## Why Utopia Planitia?

Utopia Planitia is a large impact basin located in the northern lowlands of Mars.

It was selected because of its relevance to future human exploration and research into:

- Subsurface water ice
- Martian geology
- Surface terrain
- Potential settlement infrastructure
- Resource utilization
- Long-duration exploration missions

NASA/JPL research has identified evidence of buried ice in portions of Utopia Planitia.

However, the presence of regional ice evidence does not establish that water ice exists at every proposed exploration waypoint.

**Our habitat and scientific destinations are hypothetical.**

---

## Scientific and Technical Limitations

Utopia Explorer is an **educational mission-planning simulation**, not an operational astronaut navigation system.

Important limitations include:

- Routes are conceptual and have not been verified as safe walking or driving paths.
- MOLA elevation data provides regional terrain information and may miss small obstacles, rocks, pits, and local slopes.
- Mission parameters are configurable assumptions rather than validated astronaut performance requirements.
- Local radiation, dust, temperature, communications, and spacesuit consumable conditions are not fully modeled.
- Rover energy calculations are simplified estimates.
- Scientific waypoints and habitat locations are hypothetical.
- The presence of subsurface ice at individual waypoints has not been confirmed.

The application is designed to support scientific exploration and engineering reasoning while clearly communicating uncertainty.

---

## Development and AI Assistance

Utopia Explorer was developed with AI-assisted programming tools to accelerate software implementation, testing, and documentation.

AI assistance was used during development, but scientific sources, project objectives, assumptions, and limitations are documented separately.

The project builds on earlier collaborative Mars settlement research conducted by **Team Tokamak Bruno**.

---

## NASA Space Apps Challenge

**Event:** NASA Space Apps Challenge 2026

**Challenge:** Interplanetary Survival Guide: Martian Map

**Team:** Kazakh Astro Nomads

**Project:** Utopia Explorer — Mars EVA Mission Planner

Our project addresses the challenge by combining NASA planetary information with an interactive tool for planning scientific surface exploration missions.

Rather than presenting a static map, Utopia Explorer allows users to explore mission scenarios, configure operational constraints, examine terrain information, and evaluate proposed routes.

---

## Live Demo

[![Explore Mars](https://img.shields.io/badge/🚀%20Explore%20Mars-Open%20Application-orange?style=for-the-badge)](https://fantastic-smakager-4fedaf.netlify.app/)

**Website:** https://fantastic-smakager-4fedaf.netlify.app/

---

## Credits

**Kazakh Astro Nomads**

NASA Space Apps Challenge 2026

Previous collaborative research: **Team Tokamak Bruno**

Planetary data and scientific references: **NASA, NASA/JPL, NASA PDS, and USGS**

NASA and USGS attribution does not imply endorsement of this project.

---

### From the Great Steppe to the Stars.

*Explore. Navigate. Survive.*
