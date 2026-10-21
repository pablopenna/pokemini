import { mount } from 'svelte';
import { main as doBattle, submitChoice } from '#/game/battle/battle.ts';
import SpriteRenderer from '#/components/SpriteRenderer.svelte';
import ButtonPanel from '#/components/ButtonPanel.svelte';
import BattleLog from '#/components/BattleLog.svelte';

export async function main() {
  const spriteTarget = document.getElementById('sprites');
  const buttonTarget = document.getElementById('buttons');
  const logTarget = document.getElementById('battle-log');

  if (!spriteTarget || !buttonTarget || !logTarget) {
    console.error('Missing mount targets');
    return;
  }

  mount(SpriteRenderer, { target: spriteTarget });
  mount(ButtonPanel, {
    target: buttonTarget,
    props: { onChoice: (choice: string) => submitChoice(choice) }
  });
  mount(BattleLog, { target: logTarget });

  await doBattle();
}

main();