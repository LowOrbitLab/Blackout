import packageInfo from '../../../package.json'

export const BLACKOUT = {
  name: 'Blackout',
  appId: 'io.github.loworbitlab.blackout',
  urlScheme: 'blackout',
  version: packageInfo.version,
  repository: 'https://github.com/LowOrbitLab/Blackout',
  documentation: 'https://github.com/LowOrbitLab/Blackout#readme'
} as const
