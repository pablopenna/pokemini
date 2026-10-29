import * as fsp from 'fs/promises';
import * as path from 'path';
import axios from 'axios';

/** Downloads a sprite to `destDir` as `<name><ext>` and returns its public path (e.g. `/pokemon/default/front/murkrow.png`). Throws if the download fails. */
export async function downloadImage(
  imageUrl: string,
  name: string,
  force: boolean = false,
  destDir: string = path.join('public', 'pokemon', 'default', 'front')
): Promise<string> {
  const ext = path.extname(new URL(imageUrl).pathname);
  const filename = `${name}${ext}`;
  const destPath = path.join(destDir, filename);

  if (!force) {
    try {
      await fsp.access(destPath);
      return `/${path.relative('public', destPath).replace(/\\/g, '/')}`;  // already cached
    } catch {
      // not cached, proceed
    }
  }

  await fsp.mkdir(destDir, { recursive: true });
  const { data } = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  await fsp.writeFile(destPath, data);
  console.log(`  Downloaded ${filename}`);

  return `/${path.relative('public', destPath).replace(/\\/g, '/')}`;
}
