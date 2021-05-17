<script lang="ts">
    import SimpleCanvas from "./SimpleCanvas.svelte";
    import type { Context } from "./context";
    import { YCbCr2RGB, putPixel, reduceChrominanceSize } from "./context";

    export let context: Context;
    let subsampling = "422";
    let Yp: ImageData;
    let Cr: ImageData;
    let Cb: ImageData;
    let result: ImageData;
    let errorImg: ImageData;
    let sourceSize = 1;
    let currentSize = 1;
    let error = 0;

    $: changeSubSampling(subsampling);

    function changeSubSampling(subsampling: string) {
        if (context) {
            const xFactor = subsampling === "444" ? 1 : 2;
            const yFactor = subsampling === "420" ? 2 : 1;
            
            result = new ImageData(context.RGB.width, context.RGB.height);
            errorImg = new ImageData(context.RGB.width, context.RGB.height);
            Yp = new ImageData(context.RGB.width, context.RGB.height);

            const chWidth = Math.floor((context.RGB.width + xFactor - 1) / xFactor);
            const chHeight = Math.floor((context.RGB.height + yFactor - 1) / yFactor);
            Cr = new ImageData(chWidth, chHeight);
            Cb = new ImageData(chWidth, chHeight);

            context.nCb = reduceChrominanceSize(context.Cb, context.RGB.width, context.RGB.height, xFactor, yFactor);
            context.nCr = reduceChrominanceSize(context.Cr, context.RGB.width, context.RGB.height, xFactor, yFactor);
            
            for (let i = 0; i < context.nCr.length; i += 1) {
                putPixel(Cb, i*4, YCbCr2RGB(128, context.nCb[i], 128));
                putPixel(Cr, i*4, YCbCr2RGB(128, 128, context.nCr[i]));
            }

            function dist(i:number, a: Uint8ClampedArray, b: Uint8ClampedArray) {
                return Math.sqrt((a[i]-b[i])*(a[i]-b[i])
                    + (a[i+1]-b[i+1])*(a[i+1]-b[i+1])
                    + (a[i+2]-b[i+2])*(a[i+2]-b[i+2]));
            }
    
            error = 0;
            for (let i = 0, j = 0; i < result.data.length; i += 4, j++) {
                putPixel(Yp, i, YCbCr2RGB(context.Yp[j], 128, 128));

                const y = Math.floor(Math.floor(j / context.RGB.width) / yFactor);
                const x = Math.floor((j % context.RGB.width) / xFactor);
                putPixel(result, i, YCbCr2RGB(context.Yp[j],
                    context.nCb[x + y * chWidth],
                    context.nCr[x + y * chWidth]));

                const d = dist(i, context.RGB.data, result.data);
                putPixel(errorImg, i, YCbCr2RGB(d*10, 128, 128));
                
                error += d/(1+context.RGB.data[i+0]) + d/(1+context.RGB.data[i+1]) + d/(1+context.RGB.data[i+2]);
            }
            error /= result.data.length * 3 / 4;

            sourceSize = context.RGB.width * context.RGB.height * 3;
            currentSize = context.RGB.width * context.RGB.height + chWidth * chHeight * 2;
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
    <h2>Chrominance SubSampling</h2>
    <div class="container">
        <SimpleCanvas title="Y'" data={Yp} />
        <SimpleCanvas title="Cb" data={Cb} />
        <SimpleCanvas title="Cr" data={Cr} />
        <span class="arrow">&#x2192;</span>
        <SimpleCanvas title="Result" data={result} />
        <SimpleCanvas title="Error" data={errorImg} />
    </div>
    <div>
        <span>
            Subsampling: <select bind:value={subsampling}>
                <option value="444">4:4:4</option>
                <option value="422">4:2:2</option>
                <option value="420">4:2:0</option>
            </select>
        </span>
    </div>
    <ul>
        <li><span>ratio: { sourceSize / currentSize } ({sourceSize} / {currentSize})</span></li>
        <li><span>error: { 100 * error }%</span></li>
    </ul>
    
</div>