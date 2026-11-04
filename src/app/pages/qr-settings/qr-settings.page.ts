import { SerializerService } from '@airgap/angular-core'
import { Component } from '@angular/core'
import { RangeCustomEvent, ToggleCustomEvent } from '@ionic/angular'

@Component({
  selector: 'app-qr-settings',
  templateUrl: './qr-settings.page.html',
  styleUrls: ['./qr-settings.page.scss']
})
export class QrSettingsPage {
  constructor(public readonly serializerService: SerializerService) {}

  public onToggleChange(event: Event): void {
    const value = (event as ToggleCustomEvent).detail.checked
    this.serializerService.useV3 = value
  }

  public onRangeChange(event: Event, setting: 'displayTimePerChunk' | 'singleChunkSize' | 'multiChunkSize'): void {
    const value = (event as RangeCustomEvent).detail.value
    this.serializerService[setting] = value as number
  }

  public resetSettings(): void {
    this.serializerService.resetSettings().catch(console.error)
  }
}
