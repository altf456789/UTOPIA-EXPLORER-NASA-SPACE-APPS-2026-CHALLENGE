# Data sources and attribution

Actual services and downloads were verified on **15 November 2026**. The application uses bundled historical products, not a live mission-data stream. Every mission marker is hypothetical.

## Orbital imagery

**Mars Odyssey THEMIS controlled daytime infrared mosaic, 100 m, v2 October 2018** is the default map. Credit **NASA/JPL-Caltech/Arizona State University, THEMIS Science Team; distributed by NASA Mars Trek**.

- [Verified WMTS capabilities](https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/WMTSCapabilities.xml)
- Files: `data/themis_dayir.png`, `data/themis.json`, `data/themis_wmts.xml`.
- Nominal source resolution **100 m**; cached level 9 sampling **0.001373291015625°**, about **81 m north–south**. This resampling does not improve original resolution.
- Exact crop: 1457 × 1458 pixels, approximately **109–111°E, 44–46°N**; metadata contains outer pixel edges and individual tile URLs/hashes.
- Infrared mosaic brightness supplies morphology context. It is not a calibrated or current ground-temperature layer. No live weather is inferred.

**Viking MDIM 2.1 global color mosaic** is an alternate map. Credit **NASA Viking / USGS Astrogeology; NASA/JPL-Caltech Mars Trek distribution**.

- [Verified WMTS capabilities](https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml)
- Files: `data/viking_mdim21.png`, `data/imagery.json`, `data/viking_wmts.xml`.
- Source layer name contains `232m`; the actual maximum cached level 7 sampling is **0.0054931640625°**, about **325 m north–south** using the mean Mars radius. Do not report 232 m as the cached pixel spacing.
- Crop: **365 × 366 pixels**, west **108.995361328125°E**, east **111.0003662109375°E**, south **43.9947509765625°N**, north **46.0052490234375°N**.
- Colorized composite, not ground-level natural-color truth or obstacle-resolution imagery.

Both Trek grids use Mars planetocentric latitude and east-positive longitude. The service advertises `urn:ogc:def:crs:EPSG::104905`; it is retained verbatim in metadata. Do not treat this service-specific advertised code as Earth WGS84. The geological service identifies the Mars 2000 coordinate system as **ESRI:104905**. The local app aligns the actual Mars degree coordinates directly.

## Numeric topography

**NASA Mars Global Surveyor MOLA MEGDR, 128 pixels per degree**, product **MEGT88N090HB.IMG**, dataset **MGS-M-MOLA-5-MEGDR-L3-V1.0**. Credit **NASA MGS MOLA Science Team / David E. Smith, Goddard Space Flight Center; NASA PDS Geosciences Node, Washington University in St. Louis**.

- [Raw source](https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived/meg128/megt88n090hb.img), [original PDS3 label](https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived/meg128/megt88n090hb.lbl), [PDS4 label](https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived/meg128/megt88n090hb.xml).
- Files: `data/mola.npz`, `data/mola.json`, original `.lbl` and `.xml`.
- Coordinates: **IAU2000 Mars body-fixed, planetocentric latitude, positive-east longitude**.
- Source projection: simple cylindrical, sphere **3,396 km**, center longitude **180°**, latitude and standard parallel **0°**.
- Source coverage: **44–88°N, 90–180°E**. Bundled crop: **232 rows × 256 columns**, edges **109–111°E, 44.09375–45.90625°N**. Arrays contain pixel-center coordinates; latitude decreases with row.
- Source values are signed big-endian 16-bit topography in **metres relative to the source areoid**, defined as radius minus areoid radius. They are not height above Earth sea level. No invented heights are substituted.
- Sampling **0.0078125°**, approximately **463 m north–south** and **327 m east–west at 45°N**. Source label documents interpolation in unsampled bins and profile gaps up to **12 km**. Grid spacing is not measurement density.
- A validated **HTTP 206 byte range** fetched the necessary rows, then columns were cropped without changing values. Metadata includes byte range, byte-count validation, SHA-256 of that source range and of the final asset. The full source file was not downloaded or fully hashed.
- Observations **1997–2001**, original product **2003**. See original labels for product lineage and archive migration.

The app bilinearly samples the coarse grid only between available cell centers. Outside coverage or missing data yields unavailable values. Regional slope is `atan(sqrt((dz/dx)^2+(dz/dy)^2))` with Mars metric spacing and longitude cosine correction. It is derived topography, **not local walkability evidence or an independent dataset**.

## Geological mapping

**Tanaka, K.L., Skinner, J.A. Jr., Dohm, J.M., Irwin, R.P. III, Kolb, E.J., Fortezzo, C.M., Platz, T., Michael, G.G., and Hare, T.M. (2014), Geologic Map of Mars, USGS Scientific Investigations Map 3292**, scale **1:20,000,000**.

- [Official publication](https://pubs.usgs.gov/sim/3292/), [NASA Trek-hosted service](https://trek.nasa.gov/mars/trekarcgis/rest/services/SIM3292_Global_Geology/MapServer/0).
- [Verified point query at 110°E, 45°N](https://trek.nasa.gov/mars/trekarcgis/rest/services/SIM3292_Global_Geology/MapServer/0/query?f=pjson&geometry=110%2C45&geometryType=esriGeometryPoint&inSR=104905&spatialRel=esriSpatialRelIntersects&outFields=%2A&returnGeometry=false).
- Actual query returned **eAb · Early Amazonian basin unit**, FID **1226**. This is mapped regional context, not a field sample or confirmed rock composition.
- Files: `data/geology.json`, `data/geology_point_query.json`, `data/geology_layer_metadata.json`, `data/geology_local.png`, `data/geology_region.png`.
- Degree coordinates in **GCS Mars 2000 / ESRI:104905**, positive east. Local raster: **109.6–110.4°E, 44.7–45.3°N**, 800 × 600. Its uniform color reflects a single coarse mapped unit.
- Regional raster: **90–130°E, 35–55°N**, 1000 × 500. Export pixel size does not increase the geological map's 1:20 million source detail.
- No geological unit implies buried ice, resource accessibility or a safe route.

## Regional ice research and environment

- **NASA/JPL (22 November 2016)**: [Mars Ice Deposit Holds as Much Water as Lake Superior](https://www.jpl.nasa.gov/news/mars-ice-deposit-holds-as-much-water-as-lake-superior/). This summarizes SHARAD evidence in part of Utopia Planitia at **39–49°N**. A latitude band is not a deposit footprint, and no local ice claim is assigned to a hypothetical waypoint.
- **NASA Photojournal PIA21138**: [Location of Large Subsurface Water-Ice Deposit in Utopia Planitia, Mars](https://science.nasa.gov/photojournal/location-of-large-subsurface-water-ice-deposit-in-utopia-planitia-mars/). File `data/sharad_context.jpg`; credit **NASA/JPL-Caltech/Univ. of Rome/ASI/PSI**. Original legend retained. This is a regional reference figure, **not a georeferenced local ice layer**.
- [NASA Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html): **3,389.5 km volumetric mean radius** for route calculations. Coordinate utility functions use standard Mars reference axes approximately **3396.19 / 3376.20 km**; routes themselves use the spherical mean radius.
- [NASA Mars Facts](https://science.nasa.gov/mars/facts/): general atmosphere and environment background, not local observations.

## Availability and reproduction

NASA Trek and PDS downloads succeeded. Direct USGS planetarymapping / Astrogeology access returned HTTP **403** from the build environment, so actual NASA Trek copies were used. The supplied Space Apps 2026 challenge URL returned HTTP **503**; its wording follows the user's brief. No local ice footprint, high-resolution obstacle layer, validated safe-path survey, hourly site weather, radiation feed or spacesuit-consumables model was obtained.

Bundled data are sufficient to run the demo. Optional refresh commands, from the project root:

```bash
python scripts/acquire_mars_data.py --output data
python scripts/acquire_themis.py --output data
python scripts/acquire_geology.py --output data
python scripts/validate_data.py
```

Refresh scripts stop on failed downloads rather than creating simulated replacements. See [validation notes](docs/DATA_VALIDATION.md) and [scientific limitations](docs/SCIENTIFIC_LIMITATIONS.md). Cache integrity hashes identify the exact downloaded assets; they do not imply that the scientific interpretations have been independently reproduced.
