import {
  cloneVisualData,
  parseVisualProviderId,
  type VisualData,
  type VisualProjection,
  type VisualTheme,
} from '@cordisx/protocol/visuals/v1'

const providerId = parseVisualProviderId('status.indicator')

const data = cloneVisualData({ state: 'ready', counters: [2, 3, 5] })
data satisfies VisualData

const theme: VisualTheme = 'dark'

const projection = {
  theme,
  data,
} satisfies VisualProjection

// @ts-expect-error themes are closed in v1
const unsupportedTheme: VisualTheme = 'contrast'

// @ts-expect-error callable values are outside opaque visual data
const callableData: VisualData = { run: () => undefined }

void providerId
void projection
void unsupportedTheme
void callableData
