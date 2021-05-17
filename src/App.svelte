<script lang="ts">
	//import BinaryDissector from "./binary/BinaryDissector.svelte";
	import JpegTutorial from "./JpegTutorial.svelte";
</script>

<main>
	<header>
		<h1>JPEG Compression</h1>
	</header>
	<div class="container">
		<!-- <BinaryDissector /> -->
		<JpegTutorial />
	</div>
</main>

<style>
	main {
		padding: 0 1em;
		max-width: 240px;
		margin: 0 auto;
		height: 100%;
	}

	header {
		text-align: center;
		padding: 46px;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
		margin: 0;
	}

	.container {
        height: calc(100% - (86px + 46px*2));
    }

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
