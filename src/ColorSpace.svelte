<script lang="ts">
    import type { Context } from "./context";
    import { RGB2YCrCb, YCbCr2RGB, putPixel } from "./context";
    import SimpleCanvas from "./SimpleCanvas.svelte";

    export let context: Context;
    let Yp: ImageData;
    let Cb: ImageData;
    let Cr: ImageData;

    $: context && process(context);

    function process(context: Context) {
        Yp = new ImageData(context.RGB.width, context.RGB.height);
        Cr = new ImageData(context.RGB.width, context.RGB.height);
        Cb = new ImageData(context.RGB.width, context.RGB.height);
        context.Yp = [];
        context.Cr = [];
        context.Cb = [];

        for (let i = 0; i < context.RGB.data.length; i += 4) {
            const R = context.RGB.data[i];
            const G = context.RGB.data[i+1];
            const B = context.RGB.data[i+2];
            const c = RGB2YCrCb(R, G, B);
            context.Yp.push(c.Yp);
            context.Cb.push(c.Cb);
            context.Cr.push(c.Cr);
            putPixel(Yp, i, YCbCr2RGB(c.Yp, 128, 128));
            putPixel(Cb, i, YCbCr2RGB(128, c.Cb, 128));
            putPixel(Cr, i, YCbCr2RGB(128, 128, c.Cr));
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
    span {
        font-size: 3em;
        margin: 0 20px;
    }
</style>

<div>
    <h2>Color Space Transformation</h2>
    <div class="container">
        <SimpleCanvas title="RGB" data={context["RGB"]} />
        <span>&#x2192;</span>
        <SimpleCanvas title="Y'" data={Yp} />
        <SimpleCanvas title="Cb" data={Cb} />
        <SimpleCanvas title="Cr" data={Cr} />
    </div>
</div>