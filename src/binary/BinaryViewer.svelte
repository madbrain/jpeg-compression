<script lang="ts">

    const maxLines = 50;

    export let data: Uint8Array;
    export let highlight = null;
    $: lines = getLines(data, highlight);

    function getLines(data: ArrayBuffer, highlight: any) {
        let result = "";
        if (data) {
            const lineCount = Math.min((data.byteLength + 15) / 16, maxLines);
            for (let i = 0; i < lineCount; ++i) {
                const line = data.slice(i*16, Math.min(data.byteLength, (i+1)*16));
                for (let j = 0; j < line.byteLength; ++j) {
                    if (highlight && highlight.start != highlight.end && highlight.start == (i*16+j)) {
                        result += "<span class=\"text-highlight\">";
                    }
                    result += toHex(line[j]);
                    if (highlight && highlight.start != highlight.end && highlight.end == (i*16+j+1)) {
                        result += "</span>";
                    }
                    result += " ";
                }
                result += "\n";
            }
        }
        return result;
    }

    function toHex(value: number) {
        return ("00" + value.toString(16)).substr(-2);
    }

    function handleClick(e) {
        const range = document.caretPositionFromPoint(e.clientX, e.clientY);
        const textNode = range.offsetNode;
        const offset = range.offset;
        console.log(range);
        // TODO find if textNode is pre or selection span
    }
</script>

<div>
    <pre on:click={handleClick}>{@html lines}</pre>
</div>

<style>
    pre {
        font-size: 1.5em;
    }
</style>