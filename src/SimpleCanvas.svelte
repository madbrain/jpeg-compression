
<script lang="ts">
    import { onMount, createEventDispatcher } from "svelte";
    import type { Position } from "./context";

    export let data: ImageData;
    export let title: string = null;
    export let position: Position = null;

    const BLOCK_SIZE = 8;
    const dispatcher = createEventDispatcher();
    let canvasEl: HTMLCanvasElement;
    let context: CanvasRenderingContext2D;

    $: draw(data, position);

    onMount(() => {
        context = canvasEl.getContext("2d");
        draw(data, position);
    });

    function draw(data: ImageData, position: Position) {
        if (data && canvasEl && context) {
            canvasEl.width = data.width;
            canvasEl.height = data.height;
            context.clearRect(0, 0, data.width, data.height);
            context.putImageData(data, 0, 0);

            if (position) {
                context.strokeStyle = "blue";
                context.lineWidth = 1;
                context.beginPath();
                context.rect(position.x * BLOCK_SIZE, position.y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                context.closePath();
                context.stroke();
            }
        }
    }

    function onMouseUp(e) {
        const rect = e.target.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / BLOCK_SIZE);
        const y = Math.floor((e.clientY - rect.top) / BLOCK_SIZE);
        dispatcher("select", {x, y});
    }
</script>

<style>
    h2 {
        text-align: center;
    }
</style>

<div>
    {#if title}
    <h2>{title}</h2>
    {/if}
    <canvas bind:this={canvasEl} on:mouseup={onMouseUp}></canvas>
</div>