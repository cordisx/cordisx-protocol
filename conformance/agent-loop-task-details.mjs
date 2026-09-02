/**
 * Validate the semantic canonicalization rules shared by Agent Loop v2 and
 * data-only consumers that embed AgentLoopTaskDetailsUrl.
 */
export function validateAgentLoopTaskDetailsUrl(detailsUrl, schemaValidator) {
  const errors = []
  if (schemaValidator !== undefined && !schemaValidator(detailsUrl)) {
    return (schemaValidator.errors ?? []).map(error => `${error.instancePath || '/'} ${error.message}`)
  }
  const { target, url } = detailsUrl
  if (/[\u0000-\u001F\u007F]/u.test(url)) errors.push('details URL contains an ASCII control')
  if (/\s/u.test(url)) errors.push('details URL contains whitespace')
  if (url.includes('\\')) errors.push('details URL contains a backslash')
  if (/%(?![0-9A-F]{2})/u.test(url)) errors.push('details URL contains a malformed or non-uppercase percent escape')
  for (const match of url.matchAll(/%([0-9A-F]{2})/gu)) {
    const byte = Number.parseInt(match[1], 16)
    if (byte <= 0x1f || byte === 0x7f) errors.push('details URL contains a percent-encoded ASCII control')
    if ((byte >= 0x41 && byte <= 0x5a) || (byte >= 0x61 && byte <= 0x7a) || (byte >= 0x30 && byte <= 0x39) || [0x2d, 0x2e, 0x5f, 0x7e].includes(byte)) {
      errors.push('details URL percent-encodes an unreserved character')
    }
  }
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    errors.push('details URL is not parseable')
    return errors
  }
  if (parsed.username !== '' || parsed.password !== '') errors.push('details URL contains userinfo')
  if (parsed.search !== '') errors.push('details URL contains a query')
  if (parsed.hash !== '') errors.push('details URL contains a fragment')
  if (parsed.href !== url) errors.push('details URL is not canonical')
  const allowed = target === 'host' ? ['app:'] : ['https:', 'codex:', 'claude:']
  if (!allowed.includes(parsed.protocol)) errors.push('details URL scheme does not match target')
  return errors
}
