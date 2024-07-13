import {Evented, MercatorCoordinate} from 'mapbox-gl';
import {AmbientLight, BoxGeometry, BufferAttribute, Camera, Color, DirectionalLight, DoubleSide, Group, InstancedBufferGeometry, InstancedMesh, InstancedBufferAttribute, Matrix4, Mesh, MeshLambertMaterial, RawShaderMaterial, Scene, Vector4, WebGLRenderer} from 'three';
import scales from './scales.json';
import sources from './sources.json';

const RESOLUTION_X = 64;
const RESOLUTION_Y = 64;

const boxGeometry = new BoxGeometry(1, -1, 1);
boxGeometry.translate(0.5, 0.5, 0.5);

const rainVertexBuffer = new Float32Array([
    // Front
    -0.002, 0.002, 0.01,
    0.002, 0.002, 0.01,
    -0.002, 0.002, -0.01,
    0.002, 0.002, -0.01,
    // Left
    -0.002, -0.002, 0.01,
    -0.002, 0.002, 0.01,
    -0.002, -0.002, -0.01,
    -0.002, 0.002, -0.01,
    // Top
    -0.002, 0.002, 0.01,
    0.002, 0.002, 0.01,
    -0.002, -0.002, 0.01,
    0.002, -0.002, 0.01
]);

const rainIndices = new Uint16Array([
    0, 1, 2,
    2, 1, 3,
    4, 5, 6,
    6, 5, 7,
    8, 9, 10,
    10, 9, 11
]);

const snowVertexBuffer = new Float32Array([
    // Front
    -0.004, 0.004, 0.001,
    0.004, 0.004, 0.001,
    -0.004, 0.004, -0.001,
    0.004, 0.004, -0.001,
    // Left
    -0.004, -0.004, 0.001,
    -0.004, 0.004, 0.001,
    -0.004, -0.004, -0.001,
    -0.004, 0.004, -0.001,
    // Top
    -0.004, 0.004, 0.001,
    0.004, 0.004, 0.001,
    -0.004, -0.004, 0.001,
    0.004, -0.004, 0.001
]);

const snowIndices = new Uint16Array([
    0, 1, 2,
    2, 1, 3,
    4, 5, 6,
    6, 5, 7,
    8, 9, 10,
    10, 9, 11
]);

const rainVertexShader = `
    precision highp float;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform float time;
    uniform float scale;
    attribute vec3 position;
    attribute vec3 offset;

    void main(void) {
        vec3 translate = vec3(position.x * scale + offset.x, position.y * scale + offset.y, position.z + mod(offset.z - time + 1.0, 1.0));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(translate, 1.0);
    }
`;

const rainFragmentShader = `
    precision highp float;
    uniform vec4 color;

    void main(void) {
        gl_FragColor = color;
    }
`;

function valueOrDefault(value, defaultValue) {
    return value === undefined ? defaultValue : value;
}

function resolve(object, key) {
    let first = key.split(/\.|(?=\[)/)[0];
    const rest = key.slice(first.length).replace(/^\./, '');

    if (Array.isArray(object) && first.match(/^\[-?\d+\]$/)) {
        first = +first.slice(1, -1);
        if (first < 0) {
            first += object.length;
        }
    }
    if (first in object && rest) {
        return resolve(object[first], rest);
    }
    return object[first];
}

function format(text, dict) {
    const matches = text.match(/\$\{[^}]+\}/g);

    if (matches) {
        for (const match of matches) {
            text = text.replace(match, resolve(dict, match.slice(2, -1)));
        }
    }
    return text;
}

function getMercatorBounds(canonical) {
    const {x, y, z} = canonical;
    const n = Math.pow(2, z);
    const lng1 = x / n * 360 - 180;
    const lat1 = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
    const lng2 = (x + 1) / n * 360 - 180;
    const lat2 = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI;
    const coord1 = MercatorCoordinate.fromLngLat([lng1, lat1]);
    const coord2 = MercatorCoordinate.fromLngLat([lng2, lat2]);

    return {x: coord1.x, y: coord1.y, dx: coord2.x - coord1.x, dy: coord2.y - coord1.y};
}

function createBoxMesh(z, mercatorBounds, dbz, scaleColors, material) {
    const factor = 1 / Math.pow(2, (z - 1) / 3);
    const resolutionX = Math.floor(RESOLUTION_X * factor);
    const resolutionY = Math.floor(RESOLUTION_Y * factor);
    const threshold = scaleColors[0][0];
    const instances = [];

    for (let y = 0; y < resolutionY; y++) {
        for (let x = 0; x < resolutionX; x++) {
            const level = dbz[Math.floor((y + 0.5) / resolutionY * 256) * 256 + Math.floor((x + 0.5) / resolutionX * 256)] & 127;
            if (level >= threshold) {
                for (let p = 1; p < scaleColors.length; p++) {
                    if (level < scaleColors[p][0]) {
                        instances.push({x, y, p});
                        break;
                    }
                }
            }
        }
    }
    if (instances.length === 0) {
        return;
    }

    const mesh = new InstancedMesh(boxGeometry, material, instances.length);
    for (let i = 0; i < instances.length; i++) {
        const {x, y, p} = instances[i];
        const matrix = new Matrix4()
            .makeScale(1 / resolutionX, 1 / resolutionY, 1)
            .setPosition(x / resolutionX, y / resolutionY, 0);
        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, scaleColors[p][1]);
    }
    mesh.position.x = mercatorBounds.x;
    mesh.position.y = mercatorBounds.y;
    mesh.scale.x = mercatorBounds.dx;
    mesh.scale.y = mercatorBounds.dy;
    mesh.scale.z = Math.pow(2, z < 10 ? 10 - z : z < 14 ? 0 : (14 - z) * 0.8) * 0.0002;
    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
    mesh.renderOrder = 1;
    return mesh;
}

function createRainMesh(z, mercatorBounds, dbz, scaleColors, material, snow) {
    const factor = 1 / Math.pow(2, (z - 1) / 3);
    const resolutionX = Math.floor(RESOLUTION_X * factor);
    const resolutionY = Math.floor(RESOLUTION_Y * factor);
    const threshold = scaleColors[0][0];
    const instances = [];

    for (let y = 0; y < resolutionY; y++) {
        for (let x = 0; x < resolutionX; x++) {
            const level = dbz[Math.floor((y + 0.5) / resolutionY * 256) * 256 + Math.floor((x + 0.5) / resolutionX * 256)];
            if (!snow === !(level & 128) && (level & 127) >= threshold) {
                for (let i = 0; i < Math.pow(2, ((level & 127) - threshold) / 10) * Math.max(1, z - 14); i++) {
                    instances.push({x, y});
                }
            }
        }
    }
    if (instances.length === 0) {
        return;
    }

    const instancedBufferGeometry = new InstancedBufferGeometry();

    const positions = new BufferAttribute(snow ? snowVertexBuffer : rainVertexBuffer, 3);
    instancedBufferGeometry.setAttribute('position', positions);

    instancedBufferGeometry.setIndex(new BufferAttribute(snow ? snowIndices : rainIndices, 1));

    const rainOffsetBuffer = new Float32Array(instances.length * 3);
    const offsets = new InstancedBufferAttribute(rainOffsetBuffer, 3);
    for (let i = 0; i < instances.length; i++) {
        const {x, y} = instances[i];
        offsets.setXYZ(
            i,
            (x + Math.random()) / resolutionX,
            (y + Math.random()) / resolutionY,
            Math.random()
        );
    }
    instancedBufferGeometry.setAttribute('offset', offsets);

    const mesh = new Mesh(instancedBufferGeometry, material);
    mesh.position.x = mercatorBounds.x;
    mesh.position.y = mercatorBounds.y;
    mesh.scale.x = mercatorBounds.dx;
    mesh.scale.y = mercatorBounds.dy;
    mesh.scale.z = Math.pow(2, z < 10 ? 10 - z : z < 14 ? 0 : (14 - z) * 0.8) * 0.0002;
    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
    mesh.frustumCulled = false;
    return mesh;
}

function disposeMesh(mesh) {
    if (mesh.geometry instanceof InstancedBufferGeometry) {
        mesh.geometry.dispose();
    }
    if (mesh instanceof InstancedMesh) {
        mesh.dispose();
    }
}

function loadTile(tile, callback) {
    this.constructor.prototype.loadTile.call(this, tile, err => {
        const {x, y, z} = tile.tileID.canonical;
        const position = `${z}/${x}/${y}`;
        const texture = tile.texture;
        const layer = this._parentLayer;
        const tileDict = this._tileDict;

        if (texture && layer && !tileDict[position]) {
            const gl = this.map.painter.context.gl;
            const fb = gl.createFramebuffer();
            const [width, height] = texture.size;
            const pixels = new Uint8Array(width * height * 4);
            const dbz = tile._dbz = new Uint8Array(width * height);
            const mercatorBounds = tile._mercatorBounds = getMercatorBounds(tile.tileID.canonical);

            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.texture, 0);
            gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.deleteFramebuffer(fb);

            if (layer._colors) {
                // Index scale will be supported in the next minor version
                const colors = layer._colors.map(color => parseInt(color.replace('#', '0x'), 16));
                for (let i = 0; i < dbz.length; i++) {
                    const color = ((pixels[i * 4] * 256) + pixels[i * 4 + 1]) * 256 + pixels[i * 4 + 2];
                    for (let j = 0; j < colors.length; j++) {
                        if (color === color[j]) {
                            dbz[i] = j;
                            break;
                        }
                    }
                }
            } else {
                for (let i = 0; i < dbz.length; i++) {
                    dbz[i] = pixels[i * 4];
                }
            }

            const group = layer._zoomGroups[z - 1];
            const boxMesh = createBoxMesh(z, mercatorBounds, dbz, layer._scaleColors, layer._meshMaterial);
            if (boxMesh) {
                tile._boxMesh = boxMesh;
                group.add(boxMesh);
            }
            const rainMesh = createRainMesh(z, mercatorBounds, dbz, layer._scaleColors, layer._rainMaterial);
            if (rainMesh) {
                tile._rainMesh = rainMesh;
                group.add(rainMesh);
            }
            const snowMesh = createRainMesh(z, mercatorBounds, dbz, layer._scaleColors, layer._snowMaterial, true);
            if (snowMesh) {
                tile._snowMesh = snowMesh;
                group.add(snowMesh);
            }

            tileDict[position] = tile;
        }

        callback(err);
    });
}

function unloadTile(tile, callback) {
    this.constructor.prototype.unloadTile.call(this, tile, err => {
        const {x, y, z} = tile.tileID.canonical;
        const position = `${z}/${x}/${y}`;
        const boxMesh = tile._boxMesh;
        const rainMesh = tile._rainMesh;
        const snowMesh = tile._snowMesh;

        if (boxMesh) {
            boxMesh.parent.remove(boxMesh);
            disposeMesh(boxMesh);
            delete tile._boxMesh;
        }

        if (rainMesh) {
            rainMesh.parent.remove(rainMesh);
            disposeMesh(rainMesh);
            delete tile._rainMesh;
        }

        if (snowMesh) {
            snowMesh.parent.remove(snowMesh);
            disposeMesh(snowMesh);
            delete tile._snowMesh;
        }

        delete this._tileDict[position];

        if (callback) {
            callback(err);
        }
    });
}

export default class RainLayer extends Evented {

    constructor(options) {
        super();

        this.id = options.id;
        this.type = 'custom';
        this.renderingMode = '3d';
        this.minzoom = options.minzoom;
        this.maxzoom = options.maxzoom;
        this.source = options.source || 'rainviewer';
        this.scale = options.scale || 'noaa';
        this.rainColor = options.rainColor || '#ccf';
        this.snowColor = options.snowColor || '#fff';
        this.meshOpacity = valueOrDefault(options.meshOpacity, 0.1);
        this.repaint = valueOrDefault(options.repaint, true);
        this._interval = sources[this.source].interval;
        this._colors = sources[this.source].colors;
        this._onZoom = this._onZoom.bind(this);
    }

    onAdd(map, gl) {
        this._parseColor = map.painter.context.clearColor.default.constructor.parse;

        this._scene = new Scene();
        this._camera = new Camera();

        this._directionalLight = new DirectionalLight(0xffffff);
        this._directionalLight.position.set(0, -70, 100).normalize();
        this._scene.add(this._directionalLight);

        this._ambientLight = new AmbientLight(0xffffff, .4);
        this._scene.add(this._ambientLight);

        this._meshMaterial = new MeshLambertMaterial({
            opacity: this.meshOpacity,
            transparent: this.meshOpacity < 1
        });

        let c = this._parseColor(this.rainColor);
        this._rainMaterial = new RawShaderMaterial({
            uniforms: {
                time: {type: 'f', value: 0.0},
                scale: {type: 'f', value: 1.0},
                color: {type: 'v4', value: new Vector4(c.r, c.g, c.b, c.a)}
            },
            vertexShader: rainVertexShader,
            fragmentShader: rainFragmentShader,
            transparent: c.a < 1,
            side: DoubleSide
        });

        c = this._parseColor(this.snowColor);
        this._snowMaterial = new RawShaderMaterial({
            uniforms: {
                time: {type: 'f', value: 0.0},
                scale: {type: 'f', value: 1.0},
                color: {type: 'v4', value: new Vector4(c.r, c.g, c.b, c.a)}
            },
            vertexShader: rainVertexShader,
            fragmentShader: rainFragmentShader,
            transparent: c.a < 1,
            side: DoubleSide
        });

        this._baseZoom = Math.round(map.getZoom());
        this._zoomGroups = [];
        for (let i = 0; i <= 24; i++) {
            this._zoomGroups[i] = new Group();
            this._zoomGroups[i].visible = i === this._baseZoom;
            this._scene.add(this._zoomGroups[i]);
        }

        const {scale, align} = scales[this.scale];
        this._scaleColors = scale.map(({value, color}, index, array) => {
            if (align === 'center') {
                const nextValue = index < array.length - 1 ? array[index + 1].value : Infinity;
                value = (value + nextValue) / 2;
            }
            return [value + 32, new Color(color)];
        });

        this._map = map;
        this._map.setLayerZoomRange(this.id, this.minzoom, this.maxzoom);
        this._map.on('zoom', this._onZoom);

        this._renderer = new WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true
        });

        this._renderer.autoClear = false;

        this._refreshSource();
        this._timer = setInterval(this._refreshSource.bind(this), this._interval);
    }

    onRemove() {
        delete this._parseColor;

        this._scene.remove(this._directionalLight);
        this._directionalLight.dispose();
        delete this._directionalLight;

        this._scene.remove(this._ambientLight);
        this._ambientLight.dispose();
        delete this._ambientLight;

        this._meshMaterial.dispose();
        delete this._meshMaterial;

        this._rainMaterial.dispose();
        delete this._rainMaterial;

        delete this._baseZoom;
        for (let i = 0; i <= 24; i++) {
            this._scene.remove(this._zoomGroups[i]);
        }
        delete this._zoomGroups;

        delete this._scaleColors;

        delete this._camera;
        delete this._scene;

        this._renderer.dispose();
        delete this._renderer;

        this._map.off('zoom', this._onZoom);
        this._removeSource();
        delete this._map;

        clearInterval(this._timer);
        delete this._timer;
    }

    render(gl, matrix) {
        const zoom = this._map.getZoom();

        this._rainMaterial.uniforms.time.value = performance.now() * 0.0006;
        this._rainMaterial.uniforms.scale.value = Math.pow(2, this._baseZoom - zoom - (zoom >= 10.5 ? 1 : 0));
        this._snowMaterial.uniforms.time.value = performance.now() * 0.00015;
        this._snowMaterial.uniforms.scale.value = Math.pow(2, this._baseZoom - zoom - (zoom >= 10.5 ? 1 : 0));
        this._camera.projectionMatrix = new Matrix4().fromArray(matrix);
        this._renderer.resetState();
        this._renderer.render(this._scene, this._camera);
        if (this.repaint) {
            this._map.triggerRepaint();
        }
    }

    _onZoom() {
        this._baseZoom = Math.round(this._map.getZoom());
        for (let i = 0; i <= 24; i++) {
            this._zoomGroups[i].visible = i === this._baseZoom;
        }
    }

    _refreshSource() {
        const sourceId = this.source;
        const {tiles, tileSize, minzoom, maxzoom, attribution, catalog, timestamp} = sources[sourceId];

        fetch(catalog).then(response => response.json()).then(data => {
            const map = this._map;

            this._removeSource();

            map.addSource(sourceId, {
                type: 'raster',
                tiles: tiles.map(tile => format(tile, data)),
                tileSize,
                minzoom,
                maxzoom,
                attribution
            });

            const source = map.getSource(sourceId);

            source._parentLayer = this;
            source._tileDict = {};
            source.loadTile = loadTile;
            source.unloadTile = unloadTile;

            map.addLayer({
                id: sourceId,
                type: 'raster',
                source: sourceId,
                paint: {'raster-opacity': 0}
            }, this.id);

            this.fire({type: 'refresh', timestamp: +format(timestamp, data)});
        });
    }

    _removeSource() {
        const sourceId = this.source;
        const map = this._map;
        const source = map.getSource(sourceId);

        if (source) {
            map.removeLayer(sourceId);
            map.removeSource(sourceId);
            delete source._parentLayer;
        }
    }

    setRainColor(rainColor) {
        this.rainColor = rainColor || '#ccf';
        if (this._parseColor && this._rainMaterial) {
            const {r, g, b, a} = this._parseColor(this.rainColor);

            this._rainMaterial.uniforms.color.value = new Vector4(r, g, b, a);
            this._rainMaterial.transparent = a < 1;
        }
        return this;
    }

    setSnowColor(snowColor) {
        this.snowColor = snowColor || '#fff';
        if (this._parseColor && this._snowMaterial) {
            const {r, g, b, a} = this._parseColor(this.snowColor);

            this._snowMaterial.uniforms.color.value = new Vector4(r, g, b, a);
            this._snowMaterial.transparent = a < 1;
        }
        return this;
    }

    setMeshOpacity(meshOpacity) {
        this.meshOpacity = valueOrDefault(meshOpacity, 0.1);
        if (this._meshMaterial) {
            this._meshMaterial.opacity = meshOpacity;
            this._meshMaterial.transparent = meshOpacity < 1;
        }
        return this;
    }

    getLegendHTML() {
        return [
            '<div style="font-size: 10px; line-height: 14px;"><div>dBZ</div>',
            ...scales[this.scale].scale.slice(1).reverse().map(item => `
                <div>
                    <div style="display: inline-block; vertical-align: top; width: 14px; height: 14px; background-color: ${item.color}; border: solid 0.5px #aaa;"></div>
                    <div style="display: inline-block; vertical-align: top;">${item.value}</div>
                </div>
            `),
            '</div>'
        ].join('');
    }

}
