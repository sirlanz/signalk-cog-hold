# signalk-cog-hold

Signal K server plugin that keeps the **last valid course over ground (COG)** when the GPS reports it empty at low speed.

## The problem it solves

Many NMEA 0183 GPS receivers leave the course field empty in RMC/VTG when the vessel is stationary or very slow. Signal K then sets `navigation.courseOverGroundTrue` to `null`, and NMEA 2000 converters (for example `signalk-nmea2000-emitter-cannon`) send PGN 129026 (COG & SOG, Rapid Update) with COG = *not available*.

Some NMEA 2000 displays treat this as a GPS failure. Confirmed on a **Garmin GMI 20** (software 3.30): with the boat moored, the position flashes and the "GPS lost" alarm goes off intermittently, even though PGN 129025/129029 are valid and continuous. While under way (valid COG) the display is stable. A dedicated NMEA 2000 GPS does not show the problem because it always sends a course, even a noisy one.

On a test bench, 100% of the PGN 129026 messages had COG = not available while stationary. With this plugin the flashing stopped immediately.

## What it does

- Follows `navigation.courseOverGroundTrue` from one source (default `gps.GP`).
- When the value is valid, it republishes it unchanged.
- When the value is empty, it republishes the last valid course (or a configurable initial value if none was ever received).
- Publishes under its own source, `signalk-cog-hold`, so the original data stays untouched.

SOG is not modified: a stationary vessel correctly reports SOG ≈ 0.

## Installation

From the Signal K Appstore, or manually:

```
cd ~/.signalk
npm install signalk-cog-hold
sudo systemctl restart signalk
```

## Configuration

1. **Server → Plugin Config → COG hold**: enable it, set the source to follow (as shown in the Data Browser, e.g. `gps.GP`), Submit.
2. In the **Data Browser**, check that `navigation.courseOverGroundTrue` now also has the source `signalk-cog-hold`.
3. In your NMEA 2000 converter, select `signalk-cog-hold` as the publisher for `navigation.courseOverGroundTrue` and keep SOG on the GPS. In `signalk-nmea2000-emitter-cannon`: *COG and SOG (PGN 129026) → Signal K publisher → Enter publisher manually → `signalk-cog-hold`*.
4. Optional: in **Source Priorities**, rank `signalk-cog-hold` above the GPS for `navigation.courseOverGroundTrue`, so other consumers see the same value.

The plugin status shows the last held course and how many empty values it has covered.

## Notes

- The held COG is the last measured course, not a heading. Displays will show the course the boat had when it stopped.
- Make sure only **one** plugin sends each PGN on the bus. Two converters sending the same PGN from the same address (for example `signalk-to-nmea2000` and `signalk-nmea2000-emitter-cannon` both sending 129025/129026/129029) also cause flashing values on Garmin displays.

## License

Apache-2.0
