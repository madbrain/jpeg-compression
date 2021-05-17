<script lang="ts">
    import SimpleCanvas from "./SimpleCanvas.svelte";
    import BlockMatrix from "./BlockMatrix.svelte";
    import type { Context, Position } from "./context";
    import { YCbCr2RGB, putPixel, makeBlockAt, dct, quantize,
        LUMINANCE_QUANT_TABLE, unquantize, idct, clamp1 } from "./context";

    export let context: Context;
    let Yp: ImageData;
    let position: Position = { x: 4, y: 6};
    let imageBlock = [];
    let dctBlock = [];
    let quantDctBlock = [];
    let quantBlock = [];
    let reconstructYp: ImageData;

    let quantTable;
    let quality = 50;

    $: changeContext(quality, context);

    function changeContext(quality: number, context: Context) {
        if (context) {
            const q = quality < 50
                ? 5000 / quality
                : 200 - quality * 2;
            quantTable = LUMINANCE_QUANT_TABLE.map(line => line.map(c => clamp1(Math.trunc(c * q + 50) / 100)));
            Yp = new ImageData(context.RGB.width, context.RGB.height);
            reconstructYp = new ImageData(context.RGB.width, context.RGB.height);
            for (let i = 0, j = 0; i < Yp.data.length; i += 4, j++) {
                putPixel(Yp, i, YCbCr2RGB(context.Yp[j], 128, 128));
            }
            makeBlock();
            
            for (let y = 0; y < Math.floor(context.RGB.height/8); ++y) {
                for (let x = 0; x < Math.floor(context.RGB.width/8); ++x) {
                    const result = idct(unquantize(quantize(dct(makeBlockAt(context, x, y)), quantTable), quantTable));
                    for (let yy = 0; yy < 8; ++yy) {
                        for (let xx = 0; xx < 8; ++xx) {
                            const i = ((y*8+yy)*context.RGB.width + (x*8+xx)) * 4;
                            putPixel(reconstructYp, i, YCbCr2RGB(result[yy][xx], 128, 128));
                        }
                    }
                }
            }
        }
    }

    function selectPosition(e) {
        position = e.detail;
        makeBlock();
    }

    function makeBlock() {
        if (context && context.Yp) {
            imageBlock = makeBlockAt(context, position.x, position.y);
            dctBlock = dct(imageBlock);
            quantDctBlock = quantize(dctBlock, quantTable);
            quantBlock = idct(unquantize(quantDctBlock, quantTable));
        }
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
</style>

<div>
    <h2>Block Quantize</h2>
    <div class="container">
        <SimpleCanvas title="Y'" data={Yp} {position} on:select={selectPosition} />
        <span class="arrow">&#x2192;</span>
        <BlockMatrix data={imageBlock} title="Block"/>
        <span class="arrow">&#x2192;</span>
        <BlockMatrix data={dctBlock} title="DCT" nocolor={true}/>
        <span class="arrow">⊙</span>
        <BlockMatrix data={quantTable} title="Quantization Table" nocolor={true}/>
    </div>
    <div class="container">
        <SimpleCanvas title="Quantized Result" data={reconstructYp} />
        <span class="arrow">&#x2190;</span>
        <BlockMatrix data={quantBlock} title="Quantized Block"/>
        <span class="arrow">&#x2190;</span>
        <BlockMatrix data={quantDctBlock} title="Quantized DCT" nocolor={true}/>
        <span class="arrow">&#x21B5;</span>
    </div>
    <label>Quality
        <input type="number" bind:value={quality}>
    </label>
</div>