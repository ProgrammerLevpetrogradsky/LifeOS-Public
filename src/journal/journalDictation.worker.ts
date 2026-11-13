import { env, pipeline } from '@huggingface/transformers'

env.allowLocalModels = false
env.backends.onnx.wasm!.numThreads = 1

function loadModel() {
  return pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny', {
    revision: 'ff4177021cc41f7db950912b73ea4fdf7d01d8e7',
    device: 'wasm',
    dtype: 'q8',
  })
}

let model: ReturnType<typeof loadModel> | undefined

self.onmessage = async ({ data }: MessageEvent<{ samples: Float32Array; language: string }>) => {
  try {
    const transcribe = await (model ??= loadModel())
    self.postMessage({ type: 'transcribing' })
    const result = await transcribe(data.samples, {
      language: data.language, task: 'transcribe', chunk_length_s: 25, stride_length_s: 4,
    })
    const text = (Array.isArray(result) ? result.map(chunk => chunk.text).join(' ') : result.text).trim()
    self.postMessage({ type: 'result', text })
  } catch {
    model = undefined
    self.postMessage({ type: 'error' })
  }
}
