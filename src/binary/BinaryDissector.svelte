
<script lang="ts">
    import FileSelector from "../FileSelector.svelte";
    import BinaryViewer from "./BinaryViewer.svelte";
    import TreeViewer from "./TreeViewer.svelte";
    import { analyze } from "./jpeg.analyzer";
	import type { NodeModel } from "./tree.model";

    let viewerData: Uint8Array;
	let tree: NodeModel = null;

	function onFileLoad(data: Uint8Array) {
		tree = <any>analyze(data);
		viewerData = data;
	}

	let selection = null;
	function changeSelection(e) {
		selection = e.detail;
	}
</script>

<FileSelector on:load={(e) => onFileLoad(e.detail)} />
<div class="row">
    <div class="column">
        <BinaryViewer data={viewerData} highlight={selection} />
    </div>
    <div class="column">
        <TreeViewer {tree} on:selection={changeSelection} />
    </div>
</div>

<style>

	.row {
		height: calc(100% - 56px);
	}

	.column {
		float: left;
		width: 50%;
		height: 100%;
		overflow-y: auto;
	}

	.row:after {
		content: "";
		display: table;
		clear: both;
	}
</style>
