import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.github.loworbitlab.blackout',
  appName: 'Blackout',
  bundledWebRuntime: false,
  webDir: 'www',
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      androidSplashResourceName: 'screen'
    }
  },
  server: {
    androidScheme: 'http'
  }
}

export default config
