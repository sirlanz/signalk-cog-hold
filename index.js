// signalk-cog-hold
// Follows navigation.courseOverGroundTrue from one source (default gps.GP).
// When the GPS sends an empty COG (vessel stationary or very slow), it republishes
// the last valid course under its own $source, so a downstream NMEA 2000 converter
// never has to emit PGN 129026 with COG "not available".

module.exports = function (app) {
  const PATH = 'navigation.courseOverGroundTrue'
  const plugin = {
    id: 'signalk-cog-hold',
    name: 'COG hold (last known course when stationary)',
    description: 'Republishes the last valid COG when the GPS reports it empty at low speed'
  }
  let unsubscribes = []
  let last = null
  let held = 0

  plugin.schema = {
    type: 'object',
    properties: {
      source: {
        type: 'string',
        title: 'Source of the COG to follow ($source, as shown in the Data Browser)',
        default: 'gps.GP'
      },
      initialDeg: {
        type: 'number',
        title: 'COG in degrees to publish until a first valid course is received',
        default: 0
      }
    }
  }

  plugin.start = function (options) {
    const src = (options && options.source) || 'gps.GP'
    const initial = (((options && options.initialDeg) || 0) * Math.PI) / 180
    last = null
    held = 0

    const unsub = app.streambundle.getSelfBus(PATH).onValue((d) => {
      if (!d || d.$source !== src) return
      const v = d.value
      if (typeof v === 'number' && isFinite(v)) {
        last = v
      } else {
        held++
      }
      const out = last !== null ? last : initial
      app.handleMessage(plugin.id, {
        updates: [{ values: [{ path: PATH, value: out }] }]
      })
    })
    unsubscribes.push(unsub)

    const status = () => {
      if (app.setPluginStatus) {
        app.setPluginStatus(
          `Following ${src}; last COG ${last !== null ? ((last * 180) / Math.PI).toFixed(1) + '°' : 'none yet'}; empty values covered: ${held}`
        )
      }
    }
    status()
    const timer = setInterval(status, 5000)
    unsubscribes.push(() => clearInterval(timer))
  }

  plugin.stop = function () {
    unsubscribes.forEach((f) => { try { f() } catch (e) {} })
    unsubscribes = []
  }

  return plugin
}
