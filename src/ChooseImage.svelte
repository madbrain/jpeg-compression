<script lang="ts">
    import { onMount } from "svelte";
    import FileSelector from "./FileSelector.svelte";
    import SimpleCanvas from "./SimpleCanvas.svelte";
    import type { Context } from "./context";

    const MAX_SIZE = 300;
    const DEFAULT_IMAGE = "Florence-Colgate.jpg";

    export let context : Context;

    onMount(() => {
        if (! context.RGB) {
            fetch(DEFAULT_IMAGE)
                .then(resp => resp.arrayBuffer())
                .then(r => onFileLoad(new Uint8Array(r)));
        }
    });
    
    function onFileLoad(data: Uint8Array) {
        const img = new Image();
		const fr = new FileReader();
		fr.readAsDataURL(new Blob([data]));
		fr.onload = e => {
            img.onload = () => resizeImage(img);
            img.src = <string>e.target.result;
		}
	}

    function resizeImage(img: HTMLImageElement) {
        const max = Math.max(img.width, img.height);
        const width = Math.floor(img.width * MAX_SIZE / max);
        const height = Math.floor(img.height * MAX_SIZE / max);

        const oc = document.createElement('canvas');
        oc.width = width;
        oc.height = height;

        const octx = oc.getContext('2d');
        octx.drawImage(img, 0, 0, img.width, img.height,
            0, 0, width, height);
        
        const imageData = octx.getImageData(0, 0, width, height);
        context.RGB = imageData;
    }

</script>

<div>
    <h2>Select Demo Image</h2>
    <FileSelector on:load={e => onFileLoad(e.detail)}/>
    <SimpleCanvas data={context.RGB} />
    <div>
        {#if context.RGB}
        <span>{context.RGB.width}x{context.RGB.height} RGB ({context.RGB.width*context.RGB.height*3} bytes)</span>
        {/if}
    </div>
</div>