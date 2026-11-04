import { Component } from '@angular/core'
import { Platform } from '@ionic/angular'

@Component({
  selector: 'airgap-secure-setup',
  templateUrl: './secure-setup.page.html',
  styleUrls: ['./secure-setup.page.scss']
})
export class SecureSetupPage {
  public selectedPlatform: 'android' | 'ios'

  public get isIos(): boolean {
    return this.selectedPlatform === 'ios'
  }

  public get isAndroid(): boolean {
    return this.selectedPlatform === 'android'
  }

  constructor(private readonly platform: Platform) {
    this.selectedPlatform = this.platform.is('ios') ? 'ios' : 'android'
  }

  public onPlatformChange(event: Event): void {
    const val = (event as CustomEvent).detail?.value
    if (val === 'ios' || val === 'android') {
      this.selectedPlatform = val
    }
  }
}
