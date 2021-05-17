<script lang="ts">
  import { setContext, createEventDispatcher, onMount } from "svelte";
  import { writable } from 'svelte/store';
  import { key } from "./tree.model";
  import type { NodeModel } from "./tree.model";
  import TreeNode from "./TreeNode.svelte";

  const dispatcher = createEventDispatcher();
  const selection = writable(null);

  export let tree: NodeModel;

  setContext(key, { selection });

  onMount(() => {
    selection.subscribe(x => {
      dispatcher("selection", x);
    });
  });
</script>

<ul>
  {#if tree}
  <TreeNode node={tree} />
  {/if}
</ul>

<style>
  ul {
    list-style-type: none;
    margin: 10px;
    padding: 0;
  }
</style>
