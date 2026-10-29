import * as fsp from 'fs/promises';
import * as path from 'path';
import axios from 'axios';

/** Downloads a Pokémon front sprite to public/pokemon/default/front as `<name><ext>` and returns its public path. Throws if the download fails. */
export async function downloadImage(
  imageUrl: string,
  name: string,
  force: boolean = false
): Promise<string> {
  const ext = path.extname(new URL(imageUrl).pathname);
  const filename = `${name}${ext}`;
  const destDir = path.join('public', 'pokemon', 'default', 'front');
  const destPath = path.join(destDir, filename);

  if (!force) {
    try {
      await fsp.access(destPath);
      return `/pokemon/default/front/${filename}`;  // already cached
    } catch {
      // not cached, proceed
    }
  }

  await fsp.mkdir(destDir, { recursive: true });
  const { data } = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  await fsp.writeFile(destPath, data);
  console.log(`  Downloaded ${filename}`);

  return `/pokemon/default/front/${filename}`;
}
