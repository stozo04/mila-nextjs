import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AutoConfig, AutoModel, AutoTokenizer, env } from '@huggingface/transformers';

// The text half of EmbeddingGemma 2. Photos are embedded in Steven's browser with the
// same model; search queries are embedded here so family devices never download it.
export const SEARCH_MODEL = 'onnx-community/embeddinggemma-2-ONNX';

// The model downloads on a cold start (~200 MB), and /tmp is the only writable path on Vercel.
env.cacheDir = join(tmpdir(), 'transformers-cache');

type Loaded = {
  tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>;
  model: Awaited<ReturnType<typeof AutoModel.from_pretrained>>;
};

let loading: Promise<Loaded> | null = null;
let loaded = false;

function load() {
  loading ??= (async () => {
    const config = await AutoConfig.from_pretrained(SEARCH_MODEL);
    // Text only: drops the vision and audio encoders, 270M of the 740M parameters.
    Object.assign(config, { vision_config: null, audio_config: null });
    const [tokenizer, model] = await Promise.all([
      AutoTokenizer.from_pretrained(SEARCH_MODEL),
      AutoModel.from_pretrained(SEARCH_MODEL, { config, device: 'cpu', dtype: 'q4' }),
    ]);
    loaded = true;
    return { tokenizer, model };
  })().catch(error => {
    loading = null; // let the next request retry a failed download
    throw error;
  });
  return loading;
}

export const searchModelLoaded = () => loaded;

export async function embedQuery(text: string): Promise<number[]> {
  const { tokenizer, model } = await load();
  const { sentence_embedding } = await model(await tokenizer([`task: search result | query: ${text}`]));
  return Array.from(sentence_embedding.data as Float32Array);
}
