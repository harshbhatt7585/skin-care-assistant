import { marked } from 'marked'

type ProductEntry = {
  retailer: string
  link?: string
  thumbnail?: string
  alt?: string
  reason?: string
}

export type ProductSection = {
  title: string
  entries: ProductEntry[]
}

export type ShoppingProduct = {
  title: string
  link: string
  source?: string
  price?: string
  imageUrl?: string
  rating?: number
  ratingCount?: number
  productId?: string
  position?: number
}

export type ShoppingPayload = {
  products: ShoppingProduct[]
}

export type ConcernSummary = {
  text?: string
  keywords: string[]
  concerns?: string[]
  observations?: string
  ratings?: Array<{ label: string; value: number }>
}

type ParsedEntry = ProductEntry & { lineIndexes: number[] }
type SectionMeta = { startIndex: number; data: { title: string; entries: ParsedEntry[] } }

export const parseProductSections = (
  content: string,
): { sections: ProductSection[]; remainder: string } | null => {
  const lines = content.split(/\r?\n/)
  const sections: SectionMeta[] = []
  let currentSection: SectionMeta | null = null
  let currentEntry: ParsedEntry | null = null

  const hasUpcomingBullet = (startIndex: number) =>
    lines.slice(startIndex, startIndex + 6).some((line) => line.trim().startsWith('- '))

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) return

    const normalized = trimmed.replace(/^-+\s*/, '')
    const isLink = /^link:/i.test(normalized)
    const isThumb = /^(thumbnail|image):/i.test(normalized)
    const isReason = /^why\s+it\s+fits:/i.test(normalized)

    if (!trimmed.startsWith('-') && !isLink && !isThumb && !isReason && hasUpcomingBullet(index + 1)) {
      currentSection = { startIndex: index, data: { title: trimmed, entries: [] } }
      sections.push(currentSection)
      currentEntry = null
      return
    }

    if (trimmed.startsWith('- ') && !isLink && !isThumb && !isReason) {
      const entry: ParsedEntry = { retailer: normalized, lineIndexes: [index] }
      currentEntry = entry
      currentSection?.data.entries.push(entry)
      return
    }

    if (isLink && currentEntry) {
      const linkMatch = normalized.match(/^link:\s*(https?:\/\/\S+)/i)
      if (linkMatch) {
        currentEntry.link = linkMatch[1]
        currentEntry.lineIndexes.push(index)
      }
      return
    }

    if (isThumb && currentEntry) {
      const rest = normalized.replace(/^(thumbnail|image):\s*/i, '')
      const explicit = rest.match(/\((https?:\/\/[^)]+)\)/)
      const fallback = rest.match(/https?:\/\/\S+/)
      currentEntry.thumbnail = explicit?.[1] ?? fallback?.[0]
      const altMatch = rest.match(/!\[([^\]]+)\]/)
      if (altMatch) currentEntry.alt = altMatch[1]
      currentEntry.lineIndexes.push(index)
      return
    }

    if (isReason && currentEntry) {
      const reasonText = normalized.replace(/^why\s+it\s+fits:\s*/i, '')
      currentEntry.reason = reasonText
      currentEntry.lineIndexes.push(index)
    }
  })

  const filteredSections = sections
    .map((section) => ({
      startIndex: section.startIndex,
      data: {
        title: section.data.title,
        entries: section.data.entries.filter(
          (entry) => entry.retailer && (entry.link || entry.thumbnail),
        ),
      },
    }))
    .filter((section) => section.data.entries.length > 0)

  if (filteredSections.length === 0) {
    return null
  }

  const usedIndexes = new Set<number>()
  filteredSections.forEach((section) => {
    usedIndexes.add(section.startIndex)
    section.data.entries.forEach((entry) => entry.lineIndexes.forEach((idx) => usedIndexes.add(idx)))
  })

  const remainder = lines
    .map((line, idx) => (usedIndexes.has(idx) ? '' : line))
    .join('\n')
    .trim()

  return {
    sections: filteredSections.map((section) => ({
      title: section.data.title,
      entries: section.data.entries.map((entry) => {
        const { lineIndexes, ...rest } = entry
        void lineIndexes
        return rest
      }),
    })),
    remainder,
  }
}

export const parseConcernSummary = (content: string): ConcernSummary | null => {
  if (!content.trim()) {
    return null
  }

  const extractJsonCandidate = (input: string) => {
    const fenced = input.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fenced?.[1]) {
      return fenced[1].trim()
    }
    return input.trim()
  }

  const tryParse = (candidate: string) => {
    try {
      return JSON.parse(candidate)
    } catch {
      return null
    }
  }

  const candidate = extractJsonCandidate(content)
  let parsed = tryParse(candidate)

  if (!parsed) {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      parsed = tryParse(candidate.slice(start, end + 1))
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const record = parsed as Record<string, unknown>

  const summary: ConcernSummary = {
    keywords: [],
  }

  if (Array.isArray(record.concerns)) {
    const entries = record.concerns
      .filter((entry): entry is string => typeof entry === 'string' && entry.trim())
      .map((entry) => entry.trim())
    if (entries.length) {
      summary.concerns = entries
    }
  } else if (typeof record.concerns === 'string' && record.concerns.trim()) {
    summary.text = record.concerns.trim()
  }

  const rawKeys = (record.concerns_keys ?? record.concernKeys ?? null) as unknown
  const concernKeys = Array.isArray(rawKeys)
    ? Array.from(
        new Set(
          rawKeys
            .filter((key): key is string => typeof key === 'string' && key.trim())
            .map((key) => key.trim()),
        ),
      )
    : []
  if (concernKeys.length) {
    summary.keywords = concernKeys
  }

  if (typeof record.observations === 'string' && record.observations.trim()) {
    summary.observations = record.observations.trim()
  }

  if (record.ratings && typeof record.ratings === 'object') {
    const rawRatings = record.ratings as Record<string, unknown>
    const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z]/g, '')
    const normalizedEntries = Object.entries(rawRatings).reduce<Record<string, number>>((acc, [key, value]) => {
      const normalizedKey = normalizeKey(key)
      if (!normalizedKey) return acc
      const numeric =
        typeof value === 'number'
          ? value
          : typeof value === 'string'
          ? Number(value)
          : undefined
      if (numeric !== undefined && Number.isFinite(numeric)) {
        acc[normalizedKey] = Number(numeric)
      }
      return acc
    }, {})

    const ratingOrder = [
      { key: 'hydration', label: 'Hydration' },
      { key: 'oilbalance', label: 'Oil Balance' },
      { key: 'tone', label: 'Tone' },
      { key: 'barrierstrength', label: 'Barrier Strength' },
      { key: 'sensitivity', label: 'Sensitivity' },
    ]

    const normalizedRatings = ratingOrder
      .map((entry) => {
        const value = normalizedEntries[entry.key]
        if (typeof value !== 'number') {
          return null
        }
        const clamped = Math.max(1, Math.min(5, Math.round(value)))
        return { label: entry.label, value: clamped }
      })
      .filter((entry): entry is { label: string; value: number } => Boolean(entry))

    if (normalizedRatings.length) {
      summary.ratings = normalizedRatings
    }
  }

  if (
    summary.keywords.length === 0 &&
    !summary.concerns?.length &&
    !summary.text &&
    !summary.observations &&
    !summary.ratings?.length
  ) {
    return null
  }

  if (summary.keywords.length === 0) {
    summary.keywords = []
  }

  return summary
}

export const parseShoppingPayload = (
  content: string,
): { payload: ShoppingPayload; remainder: string } | null => {
  const codeMatch = content.match(/```json([\s\S]*?)```/i)
  const candidate = codeMatch ? codeMatch[1].trim() : content.trim()
  let parsed: unknown
  const tryParse = (raw: string) => {
    try {
      parsed = JSON.parse(raw)
      return true
    } catch {
      return false
    }
  }

  if (!tryParse(candidate)) {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) {
      return null
    }
    if (!tryParse(candidate.slice(start, end + 1))) {
      return null
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const raw = parsed as Record<string, unknown>

  const toProduct = (value: Record<string, unknown> | undefined): ShoppingProduct | null => {
    if (!value) return null
    const getString = (...candidates: unknown[]) => {
      for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate.trim()
        }
      }
      return undefined
    }

    const getNumber = (...candidates: unknown[]) => {
      for (const candidate of candidates) {
        if (typeof candidate === 'number' && Number.isFinite(candidate)) {
          return candidate
        }
        if (typeof candidate === 'string') {
          const normalized = candidate.replace(/[,\s]+/g, '')
          const parsedValue = Number(normalized)
          if (!Number.isNaN(parsedValue)) {
            return parsedValue
          }
        }
      }
      return undefined
    }

    const title = getString(value['title'], value['name'])
    const link = getString(value['link'], value['website'], value?.['url'])
    if (!title || !link) return null

    const product: ShoppingProduct = { title, link }

    const source = getString(value['source'], value['retailer'], value['store'])
    if (source) product.source = source

    const price = getString(value['price'], value['offer'], value['cost'])
    if (price) product.price = price

    const imageUrl = getString(value['imageUrl'], value['thumbnail'], value['image'])
    if (imageUrl) product.imageUrl = imageUrl

    const rating = getNumber(value['rating'])
    if (rating !== undefined) product.rating = rating

    const ratingCount = getNumber(value['ratingCount'], value['reviews'])
    if (ratingCount !== undefined) product.ratingCount = ratingCount

    const productId = getString(value['productId'], value['id'])
    if (productId) product.productId = productId

    const position = getNumber(value['position'])
    if (position !== undefined) product.position = position

    return product
  }

  const products: ShoppingProduct[] = []

  const directProducts = Array.isArray(raw['products'])
    ? (raw['products'] as Array<Record<string, unknown>>)
        .map((entry) => toProduct(entry))
        .filter((entry): entry is ShoppingProduct => Boolean(entry))
    : []

  if (directProducts.length) {
    products.push(...directProducts)
  }

  if (!products.length && raw['knowledgeGraph'] && typeof raw['knowledgeGraph'] === 'object') {
    const hero = toProduct(raw['knowledgeGraph'] as Record<string, unknown>)
    if (hero) products.push(hero)
  }

  if (!products.length && Array.isArray(raw['organic'])) {
    const organicEntries = (raw['organic'] as Array<Record<string, unknown>>).map((entry) =>
      toProduct(entry),
    )
    products.push(...organicEntries.filter((entry): entry is ShoppingProduct => Boolean(entry)))
  }

  if (!products.length) {
    return null
  }

  const payload: ShoppingPayload = { products }

  const remainder = codeMatch
    ? content.replace(codeMatch[0], '').trim()
    : content.replace(candidate, '').trim()

  return {
    payload,
    remainder,
  }
}

export const stripToolArtifacts = (content: string) =>
  marked.parse(
    content
      .split(/\r?\n/)
      .filter((line) => {
        const trimmed = line.trim()
        return (
          !/^[-\s]*link:/i.test(trimmed) &&
          !/^[-\s]*(thumbnail|image):/i.test(trimmed)
        )
      })
      .join('\n'),
    { gfm: true },
  )
