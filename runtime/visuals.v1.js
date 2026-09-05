const providerIdPattern = /^[a-z0-9][a-z0-9._-]{0,95}$/

function invalidData(detail) {
  return new TypeError(`Visual data must be a JSON-compatible value: ${detail}`)
}

function cloneContainer(source, clones, visiting, stack) {
  if (visiting.has(source)) throw invalidData('cycles are not supported')
  const known = clones.get(source)
  if (known !== undefined) return known

  const array = Array.isArray(source)
  if (!array) {
    const prototype = Object.getPrototypeOf(source)
    if (prototype !== Object.prototype && prototype !== null) throw invalidData('objects must use a plain or null prototype')
  }

  const keys = Reflect.ownKeys(source)
  if (keys.some(key => typeof key !== 'string')) throw invalidData('symbol keys are not supported')
  if (array) {
    const itemKeys = keys.filter(key => key !== 'length')
    if (itemKeys.length !== source.length || itemKeys.some((key, index) => key !== String(index))) {
      throw invalidData('arrays must be dense and contain only indexed items')
    }
  }

  const target = array ? new Array(source.length) : {}
  clones.set(source, target)
  visiting.add(source)
  stack.push({ kind: 'freeze', source, target })

  const dataKeys = array ? keys.filter(key => key !== 'length') : keys
  for (let index = dataKeys.length - 1; index >= 0; index -= 1) {
    const key = dataKeys[index]
    const descriptor = Object.getOwnPropertyDescriptor(source, key)
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      throw invalidData('properties must be enumerable data properties')
    }
    stack.push({ kind: 'value', source: descriptor.value, target, key })
  }
  return target
}

function cloneValue(value, clones, visiting, stack) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw invalidData('numbers must be finite')
    return value
  }
  if (typeof value !== 'object') throw invalidData(`${typeof value} is not supported`)
  return cloneContainer(value, clones, visiting, stack)
}

/** Validate, detach, and deeply freeze one opaque visual data value. */
export function cloneVisualData(value) {
  const clones = new WeakMap()
  const visiting = new WeakSet()
  const stack = []
  const root = cloneValue(value, clones, visiting, stack)

  while (stack.length > 0) {
    const task = stack.pop()
    if (task.kind === 'freeze') {
      visiting.delete(task.source)
      Object.freeze(task.target)
      continue
    }
    const child = cloneValue(task.source, clones, visiting, stack)
    Object.defineProperty(task.target, task.key, {
      configurable: true,
      enumerable: true,
      value: child,
      writable: true,
    })
  }
  return root
}

/** Validate one owner-local provider id without adding ownership information. */
export function parseVisualProviderId(value) {
  if (typeof value !== 'string' || !providerIdPattern.test(value)) {
    throw new TypeError('Visual provider id must match the v1 local-id grammar')
  }
  return value
}
