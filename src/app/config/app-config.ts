import { AppConfig } from '@airgap/angular-core'
import { BLACKOUT } from './brand'

export const appConfig: AppConfig = {
  app: {
    name: BLACKOUT.name,
    urlScheme: BLACKOUT.urlScheme,
    universalLink: ''
  },
  otherApp: {
    name: 'AirGap Wallet',
    urlScheme: 'airgap-wallet',
    universalLink: 'wallet.airgap.it'
  }
}
