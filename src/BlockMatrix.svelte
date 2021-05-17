<script lang="ts">
    import { ZIG_ZAG_TABLE } from "./context";

    export let nocolor = false;
    export let zigzag = false;
    export let title = null;
    export let data: number[][] = [];
    
    const CELL_SIZE = 40;

    function next(i: number) {
        const pos = ZIG_ZAG_TABLE[i+1];
        return { x: pos % 8, y: Math.floor(pos/8) };
    }

    function position(i: number) {
        return { x: i % 8, y: Math.floor(i/8) };
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
<svg width="300" height="300" viewBox="0 0 {8*CELL_SIZE + 20} {8*CELL_SIZE + 20}">
    <g transform="translate(10, 10)">
        {#if !nocolor}
        {#each data as line, y}
        {#each line as value, x}
        <rect x={x*CELL_SIZE} y={y*CELL_SIZE} width={CELL_SIZE} height={CELL_SIZE} fill={`rgb(${value}, ${value}, ${value})`} />
        {/each}
        {/each}
        {/if}
        {#each data as v, i}
        <line x1="0" y1={i*CELL_SIZE} x2={8*CELL_SIZE} y2={i*CELL_SIZE} stroke="black" stroke-witdh=2/>
        <line x1={i*CELL_SIZE} y1=0 x2={i*CELL_SIZE} y2={8*CELL_SIZE} stroke="black" stroke-witdh=2/>
        {/each}
        <line x1="0" y1={8*CELL_SIZE} x2={8*CELL_SIZE} y2={8*CELL_SIZE} stroke="black" stroke-witdh=2/>
        <line x1={8*CELL_SIZE} y1=0 x2={8*CELL_SIZE} y2={8*CELL_SIZE} stroke="black" stroke-witdh=2/>
        {#if zigzag}
        {#each ZIG_ZAG_TABLE as v, i}
        {#if i != 63}
        <line x1={(position(v).x+0.5)*CELL_SIZE} y1={(position(v).y+0.5)*CELL_SIZE}
            x2={(next(i).x+0.5)*CELL_SIZE} y2={(next(i).y+0.5)*CELL_SIZE}
            stroke="blue" opacity="0.5" stroke-width=2 />
        {/if}
        {/each}
        {/if}
        {#each data as line, y}
        {#each line as value, x}
        <text x={x*CELL_SIZE} y={y*CELL_SIZE} dx={CELL_SIZE/2} dy={CELL_SIZE/2+5}
            text-anchor="middle" fill={nocolor || value >= 70 ? "black" : "white"}>{value}</text>
        {/each}
        {/each}
    </g>
</svg>
</div>