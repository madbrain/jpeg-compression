
class DataStream {
    
    public index = 0;

    constructor(private data: Uint8Array) {}

    atEnd() {
        return this.index >= this.data.length;
    }

    skip(amount: number) {
        this.index += amount;
    }

    getByte() {
        return this.data[this.index++];
    }

    getWord(): number {
        const v = this.getByte();
        return (v << 8) | this.getByte();
    }

    getZString(): string {
        let str = "";
        while (true) {
            const v = this.getByte();
            if (!v) {
                break;
            }
            str += String.fromCharCode(v);
        }
        return str;
    }

    getBytes(length: number): number[] {
        const result = [];
        for (let i = 0; i < length; ++i) {
            result.push(this.getByte());
        }
        return result;
    }

    getString(length: number): string {
        return this.getBytes(length).map(x => String.fromCharCode(x)).join("");
    }
    
}

function makeField(stream: DataStream, name: string, getter: () => any) {
    const start = stream.index;
    const value = getter();
    return { label: `${name}: ${value}`, start, end: stream.index, value }
}

function makeTableField(stream: DataStream, name: string, count: number, getter: () => any) {
    const start = stream.index;
    const lines = [];
    for (let i = 0; i < count; ++i) {
        const lineStart = stream.index;
        const value = getter();
        lines.push({ label: `${i*value.length}: ${value}`, start: lineStart, end: stream.index });
    }
    return { label: `${name}`, start, end: stream.index, children: lines }
}

export function analyze(data: Uint8Array) {
    const stream = new DataStream(data);
    const segments = [];
    while (!stream.atEnd()) {
        const start = stream.index;
        const markerType = stream.getWord();
        if (markerType == 0xFFD8) {
            segments.push({ label: "Start Of Image", start, end: stream.index });
        } else if (markerType == 0xFFD9) {
            segments.push({ label: "End Of Image", start, end: stream.index });
        } else {
            const length = makeField(stream, "length", () => stream.getWord());
            if (markerType == 0xFFE0) {
                const identifier = makeField(stream, "identifier", () => stream.getZString());
                const version = makeField(stream, "version", () => stream.getBytes(2));
                const units = makeField(stream, "units", () => stream.getByte());
                const xDensity = makeField(stream, "xDensity", () => stream.getWord());
                const yDensity = makeField(stream, "yDensity", () => stream.getWord());
                const xThumbnail = makeField(stream, "xThumbnail", () => stream.getByte());
                const yThumbnail = makeField(stream, "yThumbnail", () => stream.getByte());
                stream.skip(3 * xThumbnail.value * yThumbnail.value);
                segments.push({ label: "Application0", start, end: stream.index, children: [
                    length,
                    identifier,
                    version,
                    units,
                    xDensity,
                    yDensity,
                    xThumbnail,
                    yThumbnail
                ] });
            } else if (markerType == 0xFFFE) {
                const content = makeField(stream, "content", () => stream.getString(length.value-2));
                segments.push({ label: "Comment", start, end: stream.index, children: [ content] });
            } else if (markerType == 0xFFDB) {
                const tables = [];
                for (let i = 0; i < Math.floor(length.value / 65); ++i) {
                    const tableStart = stream.index;
                    const id = makeField(stream, "precision/destination", () => stream.getByte());
                    const values = makeTableField(stream, "values", 8, () => stream.getBytes(8));
                    tables.push({ label: "table", start: tableStart, end: stream.index, children: [ id, values ]})
                }
                segments.push({ label: "Define Quantization Tables", start, end: stream.index, children: tables });
            } else if (markerType == 0xFFC0) {
                const precision = makeField(stream, "precision", () => stream.getByte());
                const height = makeField(stream, "height", () => stream.getWord());
                const width = makeField(stream, "width", () => stream.getWord());
                const components = makeField(stream, "components", () => stream.getByte());
                const quantMapping = [];
                const startTable = stream.index;
                for (let i = 0; i < components.value; ++i) {
                    const startMapping = stream.index;
                    const id = makeField(stream, "id", () => stream.getByte());
                    const samp = makeField(stream, "x/y sampling", () => stream.getByte());
                    const qtbId = makeField(stream, "quantization table id", () => stream.getByte());
                    quantMapping.push({ label: `mapping ${i}`, start: startMapping, end: stream.index, children: [ id, samp, qtbId ]})
                }
                segments.push({ label: "Baseline DCT", start, end: stream.index, children: [
                    precision,
                    height,
                    width,
                    components,
                    { label: "Quantization Mapping", start: startTable, end: stream.index, children: quantMapping }
                ] });
            } else if (markerType == 0xFFC4) {
                const tables = [];
                let i = 0;
                while (stream.index < (start + length.value + 2)) {
                    const tableStart = stream.index;
                    const hdr = makeField(stream, "class/dest", () => stream.getByte());
                    const lengths = makeField(stream, "lengths", () => stream.getBytes(16));
                    const elements = [];
                    for (let i = 0; i < 16; ++i) {
                        elements.push(makeField(stream, `${i}`, () => stream.getBytes(lengths.value[i])));
                    }
                    tables.push({ label: "table", start: tableStart, end: stream.index, children: [
                        hdr, lengths, { label: "elements", children: elements }
                    ]});
                    ++i;
                }
                segments.push({ label: "Define Huffman Tables", start, end: stream.index, children: tables });
            } else if (markerType == 0xFFDA) {
                const components = makeField(stream, "components", () => stream.getByte());
                const componentMapping = [];
                const tableStart = stream.index;
                for (let i = 0; i < components.value; ++i) {
                    const componentStart = stream.index;
                    const selector = makeField(stream, "selector", () => stream.getByte());
                    const tables = makeField(stream, "tables dc/ac", () => stream.getByte());
                    componentMapping.push({ label: `component ${i}`, start: componentStart, end: stream.index, children: [ selector, tables ]})
                }
                const tableEnd = stream.index;
                const spectralSelect = makeField(stream, "spectral select", () => stream.getBytes(2));
                const successiveApprox = makeField(stream, "successive approx", () => stream.getByte());

                const dataStart = stream.index;
                // in data 0xFF is escaped by following it with 0x00, otherwise it's a segment marker
                while (true) {
                    const first = stream.getByte();
                    if (first == 0xFF) {
                        const second = stream.getByte();
                        if (second != 0x00) {
                            break;
                        }
                    }
                }
                stream.skip(-2)

                segments.push({ label: "Start Of Scan", start, end: stream.index, children: [
                    length,
                    components,
                    { label: "Components", start: tableStart, end: tableEnd, children: componentMapping },
                    spectralSelect,
                    successiveApprox,
                    { label: `data ${stream.index - dataStart}`, start: dataStart, end: stream.index },
                ] });
            } else {
                stream.skip(length.value - 2);
                segments.push({ label: `Unknown maker ${markerType.toString(16)}`, start, end: stream.index, children: [
                    length,
                ] });
            }
        }
    }
    return { label:"Segments", children: segments };
}