# Mapbox GL JS Rain Layer

*An animated rain layer for [Mapbox GL JS](https://github.com/mapbox/mapbox-gl-js)*

![Screenshot](https://nagix.github.io/mapbox-gl-rain-layer/screenshot1.jpg)

See a [Live Demo](https://nagix.github.io/mapbox-gl-rain-layer).

The rain animation is up to date according to the current radar data from data sources. In addition to the density of raindrops, the colors of semi-transparent boxes indicate the intensity of rainfall.

Version 0.7 requires Mapbox GL JS 0.54.0 or later, and only works with the Mercator projection. This component works on [browsers that support ES6](https://caniuse.com/es6). It supports the Mapbox Standard style but only works at zoom level 6 or above.

## Installation

You can download the latest version of Mapbox GL JS Rain Layer from the [GitHub releases](https://github.com/nagix/mapbox-gl-rain-layer/releases/latest).

To install via npm:

```bash
npm install mapbox-gl-rain-layer --save
```

To use CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/mapbox-gl-rain-layer@latest/dist/mapbox-gl-rain-layer.min.js"></script>
```

## Usage

Mapbox GL JS Rain Layer can be used with ES6 modules, plain JavaScript and module loaders.

Mapbox GL JS Rain Layer requires [Mapbox GL JS](https://github.com/mapbox/mapbox-gl-js). Include Mapbox GL JS and Mapbox GL JS Rain Layer to your page, then you can use the `RainLayer` class, which can be added to your map as a layer.

```js
const rainLayer = new RainLayer({
    id: 'rain',
    source: 'rainviewer',
    scale: 'noaa'
});
map.addLayer(rainLayer);

// You can get the HTML text for the legend
const legendHTML = rainLayer.getLegendHTML();

// You can receive radar data refresh events
// data.timestamp - Unix timestamp in seconds (UTC) when the data was generated
rainLayer.on('refresh', data => {
    console.log(data.timestamp);
});
```

### Usage in ES6 as module

Import the module as `RainLayer`, and use it in the same way as described above.

```js
import RainLayer from 'mapbox-gl-rain-layer';
```

## Samples

You can find an interactive demo at [nagix.github.io/mapbox-gl-rain-layer](https://nagix.github.io/mapbox-gl-rain-layer).

## API

### Constructor Options

`RainLayer` supports the following constructor options.

| Name | Type | Default | Description
| ---- | ---- | ------- | -----------
| **`options.id`** | `string` | | A unique identifier that you define.
| **`options.maxzoom`** | `number` | | The maximum zoom level for the layer. At zoom levels equal to or greater than the maxzoom, the layer will be hidden. The value can be any number between `0` and `24` (inclusive). If no maxzoom is provided, the layer will be visible at all zoom levels for which there are tiles available.
| **`options.meshOpacity`** | `number` | `0.1` | The opacity of mesh boxes. The value can be any number between `0` and `1` (inclusive).
| **`options.minzoom`** | `number` | | The minimum zoom level for the layer. At zoom levels less than the minzoom, the layer will be hidden. The value can be any number between `0` and `24` (inclusive). If no minzoom is provided, the layer will be visible at all zoom levels for which there are tiles available.
| **`options.rainColor`** | `string` | `'#ccf'` | The color of raindrops. Colors are strings in a variety of permitted formats: HTML-style hex values, RGB, RGBA, HSL and HSLA. Predefined HTML colors names, like `yellow` and `blue`, are also permitted. The default is light blue.
| **`options.slot`** | `string` | | (Optional) The identifier of a slot layer that will be used to position this layer.
| **`options.snowColor`** | `string` | `'#fff'` | The color of snowflakes. Colors are strings in a variety of permitted formats: HTML-style hex values, RGB, RGBA, HSL and HSLA. Predefined HTML colors names, like `yellow` and `blue`, are also permitted. The default is white.
| **`options.repaint`** | `boolean` | `true` | If true, rendering is automatically triggered for every frame. If false, `Map#triggerRepaint()` needs to be called explicitly.
| **`options.scale`** | `string` | `'noaa'` | The type of the color scale for the radar/precipitation data. Currently, only `'noaa'` is supported. See [Radar Images: Reflectivity](https://www.weather.gov/jetstream/refl) by National Weather Service for details.
| **`options.source`** | `string` | `'rainviewer'` | The data source for the layer. Currently, only `'rainviewer'` is supported.

### Instance Members

#### **`getLegendHTML()`**

Returns the HTML text for the legend.

##### Returns

`string`: The HTML text for the legend.

#### **`off(type, listener)`**

Removes an event listener previously added with `RainLayer#on`.

##### Parameters

**`type`** (string) The event type previously used to install the listener.

**`listener`** (function) The function previously installed as a listener.

##### Returns

`RainLayer`: `this`

#### **`on(type, listener)`**

Adds a listener for events of a specified type.

##### Parameters

**`type`** (`string`) The event type to listen for.

**`listener`** (`function`) The function to be called when the event is fired.

##### Returns

`RainLayer`: `this`

#### **`once(type, listener)`**

Adds a listener that will be called only once to a specified event type.

##### Parameters

**`type`** (`string`) The event type to add a listener for.

**`listener`** (`function`) The function to be called when the event is fired.

##### Returns

`RainLayer`: `this`

#### **`setMeshOpacity(opacity)`**

Sets the opacity of mesh boxes.

##### Parameters

**`opacity`** (`number`) The opacity of mesh boxes. The value can be any number between `0` and `1` (inclusive).

##### Returns

`RainLayer`: `this`

#### **`setRainColor(color)`**

Sets the color of raindrops.

##### Parameters

**`color`** (`string`) The color of raindrops. Colors are strings in a variety of permitted formats: HTML-style hex values, RGB, RGBA, HSL and HSLA. Predefined HTML colors names, like `yellow` and `blue`, are also permitted.

##### Returns

`RainLayer`: `this`

#### **`setSnowColor(color)`**

Sets the color of snowflakes.

##### Parameters

**`color`** (`string`) The color of snowflakes. Colors are strings in a variety of permitted formats: HTML-style hex values, RGB, RGBA, HSL and HSLA. Predefined HTML colors names, like `yellow` and `blue`, are also permitted.

##### Returns

`RainLayer`: `this`

### Events

#### **`refresh`**

Fired when the radar data is refreshed.

##### Properties

**`timestamp`** (`number`): Unix timestamp in seconds (UTC) when the data was generated

## Building

You first need to install node dependencies (requires [Node.js](https://nodejs.org/)):

```bash
npm install
```

The following commands will then be available from the repository root:

```bash
npm run build    # build dist files
npm run lint     # perform code linting
```

## About Data

The data for this visualization are sourced from [RainViewer](https://www.rainviewer.com), which also gathers data from [different data sources](https://www.rainviewer.com/sources.html).

## License

Mapbox GL JS Rain Layer is available under the [MIT license](https://opensource.org/licenses/MIT).
