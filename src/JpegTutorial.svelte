<script lang="ts">
    import ChooseImage from "./ChooseImage.svelte";
    import ColorSpace from "./ColorSpace.svelte";
    import SubSampling from "./SubSampling.svelte";
    import BlockDivide from "./BlockDivide.svelte";
    import BlockQuantize from "./BlockQuantize.svelte";
    import BlockZigZag from "./BlockZigZag.svelte";

    const pages = [
        ChooseImage,
        ColorSpace,
        SubSampling,
        BlockDivide,
        BlockQuantize,
        BlockZigZag,
        //   BlockHuffman
    ];
    let current = 0;
    let context = {};

    function previousPage() {
        if (current > 0) {
            current -= 1;
        }
    }

    function nextPage() {
        if (current < pages.length - 1) {
            current += 1;
        }
    }
</script>

<div>
    <button on:click={previousPage}>Previous</button>
    <button on:click={nextPage}>Next</button>
    <svelte:component this={pages[current]} {context} />
</div>
