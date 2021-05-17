<script lang="ts">
    import { createEventDispatcher } from "svelte";
    
    const dispather = createEventDispatcher();
    let files: FileList;
    $: files && handleFile(files[0]);

    function handleFile(file: File) {
        const reader = new FileReader();
        reader.onload = (e) => {
            dispather("load", new Uint8Array(<any>e.target.result));
        };
        reader.readAsArrayBuffer(file);
    }
</script>

<div>
    <input type="file" bind:files />
</div>
