import * as fsp from 'fs/promises';
import * as path from 'path';
import axios from 'axios';

export async function downloadImage(
  imageUrl: string,
  routeId: string,
  force: boolean = false
): Promise<string> {
  const ext = path.extname(new URL(imageUrl).pathname);
  const filename = `${routeId}${ext}`;
  const destDir = path.join('public', 'locations');
  const destPath = path.join(destDir, filename);

  if (!force) {
    try {
      await fsp.access(destPath);
      return `/locations/${filename}`;  // already cached
    } catch {
      // not cached, proceed
    }
  }

  await fsp.mkdir(destDir, { recursive: true });
  const { data } = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  await fsp.writeFile(destPath, data);
  console.log(`  Downloaded ${filename}`);

  return `/locations/${filename}`;
}
