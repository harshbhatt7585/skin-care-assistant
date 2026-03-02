const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const IMAGE_GEN_URL =
  process.env.NEXT_PUBLIC_IMAGE_GEN_API_URL ?? `${BASE_URL}/agent/generate-tryon-model`

type GenerateTryOnModelPayload = {
  uid?: string
  photoDataUrl: string
  modelPrompt?: string
  backgroundStyle?: string
}

type GenerateTryOnModelApiResponse = {
  model_id?: string
  modelId?: string
  model_image_url?: string
  modelImageUrl?: string
  imageUrl?: string
  image?: string
  output?: string
}

export type GenerateTryOnModelResult = {
  modelId?: string
  modelImageUrl: string
  endpoint: string
}

const pickImageUrl = (payload: GenerateTryOnModelApiResponse): string | null => {
  const candidate =
    payload.model_image_url ??
    payload.modelImageUrl ??
    payload.imageUrl ??
    payload.image ??
    payload.output

  if (!candidate || typeof candidate !== 'string') return null
  const trimmed = candidate.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function generateTryOnModel({
  uid,
  photoDataUrl,
  modelPrompt,
  backgroundStyle,
}: GenerateTryOnModelPayload): Promise<GenerateTryOnModelResult> {
  const response = await fetch(IMAGE_GEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      photo_data_url: photoDataUrl,
      model_prompt: modelPrompt,
      background_style: backgroundStyle,
    }),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(
      message ||
        `Model generation failed (${response.status}). Check NEXT_PUBLIC_IMAGE_GEN_API_URL.`
    )
  }

  const payload = (await response.json()) as GenerateTryOnModelApiResponse
  const modelImageUrl = pickImageUrl(payload)

  if (!modelImageUrl) {
    throw new Error('Image generation response did not include a model image URL.')
  }

  return {
    modelId: payload.model_id ?? payload.modelId,
    modelImageUrl,
    endpoint: IMAGE_GEN_URL,
  }
}
