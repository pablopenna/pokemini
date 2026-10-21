<script lang="ts">
  let count = $state(0);
</script>

<button onclick={() => count++}>
  Clicked {count} times
</button>