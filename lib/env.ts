const warned = new Set<string>()

export function warnMissingEnv(names: string[], context: string) {
  const missing = names.filter((name) => !process.env[name])
  if (missing.length === 0) return

  const key = `${context}:${missing.sort().join(",")}`
  if (warned.has(key)) return
  warned.add(key)

  console.warn(
    `[env] Missing ${missing.join(
      ", "
    )} required for ${context}. Check Vercel env vars.`
  )
}
