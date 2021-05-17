<script lang="ts">
    import SimpleCanvas from "./SimpleCanvas.svelte";
    import BlockMatrix from "./BlockMatrix.svelte";
    import type { Context, Position } from "./context";
    import { YCbCr2RGB, putPixel, makeBlockAt, dct, quantize,
        LUMINANCE_QUANT_TABLE, unquantize, idct, clamp1, ZIG_ZAG_TABLE } from "./context";
import { run } from "svelte/internal";

    export let context: Context;
    let Yp: ImageData;
    let position: Position = { x: 4, y: 6};
    let quantDctBlock = [];
    let reconstructYp: ImageData;

    let quantTable;
    let quality = 50;

    let codes: {skip:number, size: number}[] = [];
    let values: number[] = [];
    let simpleZigZag: number[] = [];
    let dcEncodingTable: {[key:number]: {size: number, value: number}};
    let acEncodingTable: {[key:number]: {size: number, value: number}};
    let bitString: string[] = [];
    let byteString: number[] = [];

    $: changeContext(quality, context);

    function changeContext(quality: number, context: Context) {
        if (context) {
            const q = quality < 50
                ? 5000 / quality
                : 200 - quality * 2;
            quantTable = LUMINANCE_QUANT_TABLE.map(line => line.map(c => clamp1(Math.trunc(c * q + 50) / 100)));
            Yp = new ImageData(context.RGB.width, context.RGB.height);
            //reconstructYp = new ImageData(context.RGB.width, context.RGB.height);
            
            for (let i = 0, j = 0; i < Yp.data.length; i += 4, j++) {
                putPixel(Yp, i, YCbCr2RGB(context.Yp[j], 128, 128));
            }
            
            let codes: {skip:number, size: number}[] = [];
            let values: number[] = [];
            for (let y = 0; y < Math.floor(context.RGB.height/8); ++y) {
                for (let x = 0; x < Math.floor(context.RGB.width/8); ++x) {
                    const block = quantize(dct(makeBlockAt(context, x, y)), quantTable);
                    runlength(block, codes, values);
                }
            }
            const histoDC = {};
            const histoAC = {};
            let isEOB = true;
            codes.forEach(c => {
                if (isEOB) {
                    const v = c.size;
                    const count = histoDC[v] || 0
                    histoDC[v] = count + 1;
                    isEOB = false;
                } else {
                    let skip = c.skip;
                    while (skip > 15) {
                        const count = histoAC[15<<4] || 0
                        histoAC[15<<4] = count + 1;
                        skip -= 16;
                    }
                    const v = (skip << 4) | c.size;
                    if (v == 0) {
                        isEOB = true;
                    }
                    const count = histoAC[v] || 0
                    histoAC[v] = count + 1;
                }
            });
            dcEncodingTable = buildEncodingTable(buildHuffmanTree(histoDC));
            acEncodingTable = buildEncodingTable(buildHuffmanTree(histoAC));

            makeBlock();
        }
    }

    function selectPosition(e) {
        position = e.detail;
        makeBlock();
    }

    function makeBlock() {
        if (context && context.Yp) {
            const imageBlock = makeBlockAt(context, position.x, position.y);
            quantDctBlock = quantize(dct(imageBlock), quantTable);
            simpleZigZag = zigzag(quantDctBlock);
            codes = [];
            values = [];
            runlength(quantDctBlock, codes, values);
            const r = encode(codes, values);
            bitString = r.bitString;
            byteString = r.bytes;
        }
    }

    function encode(codes: {skip:number, size: number}[], values: number[]) {
        let stringResult = [];
        let byteResult = [];
        let bitCount = 8;
        let bitBuffer = 0;
        function emit(value: number, size: number) {
            const mask = (1<<size)-1;
            const v = (value < 0 ? value + (1<<size) : value) & mask;
            let s = "";
            for (let i = size-1; i >= 0; --i) {
                s += v&(1<<i) ? "1" : "0";
            }
            stringResult.push(s);

            while (size > bitCount) {
                bitBuffer |= (value & mask) >> (size - bitCount);
                byteResult.push(bitBuffer);
                size -= bitCount;
                bitCount = 8;
                bitBuffer = 0;
            }
            bitBuffer |= (value & mask) << (bitCount - size);
            bitCount -= size;
        }

        let bitSize = codes[0].size;
        let bitSizeCode = dcEncodingTable[bitSize];
        emit(bitSizeCode.value, bitSizeCode.size);
        emit(values[0], bitSize);

        for (let i = 1; i < codes.length; ++i) {
            let skip = codes[i].skip;
            while (skip > 15) {
                let bitSizeCode = acEncodingTable[15<<4];
                emit(bitSizeCode.value, bitSizeCode.size);
                skip -= 16;
            }
            let bitSizeCode = acEncodingTable[skip<<4 | codes[i].size];
            emit(bitSizeCode.value, bitSizeCode.size);
            if (values[i] != 0) {
                emit(values[i], codes[i].size);
            }
        }
        if (bitCount < 8) {
            byteResult.push(bitBuffer);
        }
        return { bitString: stringResult, bytes: byteResult };
    }

    function buildHuffmanTree(histo: { [key: number]: number}) {
        let nodes = [];
        for (let value in histo) {
            nodes.push({value, count: histo[value]});
        }
        while (nodes.length > 1) {
            nodes.sort((a, b) => b.count - a.count);
            const [left, right] = nodes.splice(nodes.length-2, 2);
            nodes.push({count: left.count + right.count, left, right});
        }
        return nodes[0];
    }

    function buildEncodingTable(root) {
        const result = {};
        function walk(node, size, value) {
            if (node.value) {
                result[node.value] = { size, value };
            } else {
                walk(node.left, size+1, value*2);
                walk(node.right, size+1, value*2+1);
            }
        }
        walk(root, 0, 0);
        return result;
    }

    function zigzag(block: number[][]) {
        const result = [];
        ZIG_ZAG_TABLE.forEach(p => {
            const v = block[Math.floor(p/8)][p%8];
            result.push(v);
        });
        return result;
    }

    function runlength(block: number[][], codes: {skip:number, size: number}[], values: number[]) {
        function bitSize(v: number) {
            for (let i = 0; i < 16; ++i) {
                const mask = (1<<i)-1;
                if (v >= 0 && (v & mask) == v) {
                    return i+1;
                } else if ((v & mask) == (v + (1<<i))) {
                    return i+1;
                }
            }
        }
        let zeroCount = 0;
        ZIG_ZAG_TABLE.forEach(p => {
            const v = block[Math.floor(p/8)][p%8];
            if (v != 0) {
                if (codes.length == 0) {
                    codes.push({skip: 0, size: bitSize(v)});
                    values.push(v);
                } else {
                    codes.push({skip: zeroCount, size: bitSize(v)});
                    values.push(v);
                    zeroCount = 0;
                }
            } else {
                zeroCount++;
            }
        });
        codes.push({skip: 0, size: 0});
        values.push(0);
    }

    function toHex(value: number) {
        return ("0" + (value & 0xFF).toString(16)).slice(-2);
    }

</script>

<style>
    .container {
        display: flex;
        flex-flow: row nowrap;
        align-items: center;
        gap: 20px;
    }
    .arrow {
        font-size: 3em;
        margin: 0 20px;
    }
    .result {
        width: 300px;
    }
</style>

<div>
    <h2>Block Zig-Zag & Run-Length</h2>
    <div class="container">
        <SimpleCanvas title="Y'" data={Yp} {position} on:select={selectPosition} />
        <span class="arrow">&#x2192;</span>
        <BlockMatrix data={quantDctBlock} title="Quantized Block" nocolor={true} zigzag={true}/>
        <span class="arrow">&#x2192;</span>
        <div>
            <p class="result">{#each simpleZigZag as c, i}{c} {/each}</p>
            <p class="result">{#each codes as c, i}{#if i != 0}({c.skip}){/if} {#if c.size != 0} {values[i]}{/if} {/each}</p>
            <p class="result">{#each codes as c, i}({#if i != 0}{c.skip},{/if}{c.size}) {#if c.size != 0} {values[i]}{/if} {/each}</p>
            <p class="result">{#each bitString as c}{c} {/each}</p>
            <p class="result">{#each byteString as c}{toHex(c)} {/each}</p>
        </div>
    </div>
    <label>Quality <input type="number" bind:value={quality}></label>
    <p>First zigzag, then run length, run-length with value size in bits, finally codes and values huffman encoded bit string and bytes.
        (ratio for current block: 1/{Math.floor(6400/byteString.length)/100})</p>
</div>