import { mount } from 'svelte';

import { main as doBattle } from '#/game/battle/battle.ts';
import Test from '#/Test.svelte';

export async function main() {
  console.log("heelo?");
  const target = document.getElementById('app');
  if (target) {
        // Mount the component, optionally passing props
        const battlePanel = mount(Test, {
            target: target,
            props: {
                // Pass your battle state or other data as props here
                // e.g., battle: clientBattle
            }
        });

        // The `mount` function returns an object with an `unmount` method if you need it later
        console.log(battlePanel);
  } else {
    console.error("NO ELEMENT!");
  }
  
  await doBattle();
}

main();