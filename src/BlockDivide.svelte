<script lang="ts">
    import SimpleCanvas from "./SimpleCanvas.svelte";
    import BlockMatrix from "./BlockMatrix.svelte";
    import type { Context, Position } from "./context";
    import { YCbCr2RGB, putPixel, makeBlockAt, dct } from "./context";

    export let context: Context;
    let Yp: ImageData;
    let position: Position = { x: 4, y: 6};
    let imageBlock = [];
    let dctBlock = [];

    $: changeContext(context);

    function changeContext(context: Context) {
        if (context) {
            Yp = new ImageData(context.RGB.width, context.RGB.height);
            for (let i = 0, j = 0; i < Yp.data.length; i += 4, j++) {
                putPixel(Yp, i, YCbCr2RGB(context.Yp[j], 128, 128));
            }
            makeBlock();
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
    <h2>Block Divide & DCT</h2>
    <div class="container">
        <SimpleCanvas title="Y'" data={Yp} {position} on:select={selectPosition} />
        <span class="arrow">&#x2192;</span>
        <BlockMatrix data={imageBlock} title="Block"/>
        <span class="arrow">&#x2192;</span>
        <BlockMatrix data={dctBlock} title="DCT" nocolor={true}/>
    </div>
    <p>Toggle DCT values by clicking and show corresponding pattern?</p>
</div>