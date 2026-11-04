import { BLACKOUT } from '../config/brand'

export type AppLink = { kind: 'account'; protocol?: string } | { kind: 'request'; url: string }

export function parseAppLink(value: string): AppLink | undefined {
  try {
    const url = new URL(value)
    if (url.protocol !== `${BLACKOUT.urlScheme}:`) return undefined
    if (url.username || url.password || url.port || url.hash) return undefined
    if (!url.hostname && !url.pathname && !url.search) return { kind: 'account' }
    if (url.hostname === 'add-account' && !url.search) {
      const protocol = url.pathname.replace(/^\//, '')
      return /^[a-z0-9_-]*$/i.test(protocol) ? { kind: 'account', protocol: protocol || undefined } : undefined
    }
    if (!url.hostname && (!url.pathname || url.pathname === '/') && (url.searchParams.get('d') || url.searchParams.get('ur'))) {
      return { kind: 'request', url: value }
    }
    return undefined
  } catch {
    return undefined
  }
}
