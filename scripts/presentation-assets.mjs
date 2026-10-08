import {readFile,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';

// The originals are split only for repository transfer. Published PPTX files
// must match the uploaded originals byte for byte.
export const presentationSources=[
  {
    "file": "layout-formats.pptx",
    "parts": [
      "layout-formats.pptx"
    ],
    "bytes": 8815251,
    "sha256": "60a801a255f9bf84614310ae2be432068898825e6fb4b53f185081614d042db0"
  },
  {
    "file": "anime-components.pptx",
    "parts": [
      "source/anime-components.pptx.part1",
      "source/anime-components.pptx.part2",
      "source/anime-components.pptx.part3"
    ],
    "bytes": 17367639,
    "sha256": "b9f28dfb4843607aaf2808ebca4fb78d4f3cb9acbeab79fe73ac3264bf52932f"
  },
  {
    "file": "mini-components.pptx",
    "parts": [
      "source/mini-components.pptx.part1",
      "source/mini-components.pptx.part2"
    ],
    "bytes": 16264088,
    "sha256": "ea27bce23f98ed20724e169c76cb4ed36aa7ceffbe7942f29fbcf0d029d9b318"
  }
];
export async function assemblePresentationAssets(outputDir){
 for(const source of presentationSources){
  const buffers=await Promise.all(source.parts.map(part=>readFile(join('templates/presentation',part))));
  const bytes=Buffer.concat(buffers);
  if(bytes.length!==source.bytes||createHash('sha256').update(bytes).digest('hex')!==source.sha256)throw Error(`Presentation source integrity failed: ${source.file}`);
  await writeFile(join(outputDir,'templates/presentation',source.file),bytes);
 }
 await rm(join(outputDir,'templates/presentation/source'),{recursive:true,force:true});
}
