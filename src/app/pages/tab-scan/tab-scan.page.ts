import { IACHandlerStatus, IACMessageTransport, PermissionsService, QrScannerService } from '@airgap/angular-core'
import { PercentPipe } from '@angular/common'
import { Component, Inject, NgZone, ViewChild } from '@angular/core'
import { Platform } from '@ionic/angular'
import { ZXingScannerComponent } from '@zxing/ngx-scanner'
import { SecurityUtilsPlugin } from 'src/app/capacitor-plugins/definitions'
import { SECURITY_UTILS_PLUGIN } from 'src/app/capacitor-plugins/injection-tokens'
import { IACService } from 'src/app/services/iac/iac.service'
// import { NavigationService } from 'src/app/services/navigation/navigation.service'

import { ErrorCategory, handleErrorLocal } from '../../services/error-handler/error-handler.service'
import { ScanBasePage } from '../scan-base/scan-base'
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support'

@Component({
  selector: 'airgap-tab-scan',
  templateUrl: './tab-scan.page.html',
  styleUrls: ['./tab-scan.page.scss'],
  providers: [PercentPipe]
})
export class TabScanPage extends ScanBasePage {
  @ViewChild('scanner')
  public zxingScanner?: ZXingScannerComponent

  public percentageScanned: number = 0

  private parts: Set<string> = new Set()

  public isMultiQr: boolean = false

  public readonly progressSegments: number[] = [0, 1, 2, 3, 4, 5, 6, 7]

  public torchEnabled: boolean = false

  public get scannedFramesCount(): number {
    return this.parts.size
  }

  public get estimatedTotalFrames(): number {
    if (this.percentageScanned > 0 && this.parts.size > 0) {
      return Math.max(this.parts.size, Math.round(this.parts.size / this.percentageScanned))
    }
    return 8
  }

  public get filledSegmentsCount(): number {
    if (!this.isMultiQr || this.percentageScanned <= 0) {
      return 0
    }
    return Math.max(1, Math.min(8, Math.round(this.percentageScanned * 8)))
  }

  constructor(
    platform: Platform,
    scanner: QrScannerService,
    permissionsProvider: PermissionsService,
    @Inject(SECURITY_UTILS_PLUGIN) securityUtils: SecurityUtilsPlugin,
    private readonly iacService: IACService,
    private readonly ngZone: NgZone // private readonly navigationService: NavigationService
  ) {
    super(platform, scanner, permissionsProvider, securityUtils)
  }

  public toggleTorch(): void {
    this.torchEnabled = !this.torchEnabled
    if (this.zxingScanner) {
      try {
        ;(this.zxingScanner as any).torch = this.torchEnabled
      } catch {
        // Ignore if device does not support torch in browser/electron
      }
    }
  }

  async ionViewWillLeave() {
    super.ionViewWillLeave()
  }

  public async ionViewWillEnter(): Promise<void> {
    await super.ionViewWillEnter()
    this.resetScannerPage()
    this.iacService.resetHandlers()
    if (this.platform.is('android')) {
      await EdgeToEdge.disable()
    }
  }

  private resetScannerPage(): void {
    this.parts = new Set()
    this.percentageScanned = 0
    this.isMultiQr = false
    this.iacService.resetHandlers()
  }

  public async checkScan(data: string): Promise<boolean | void> {
    const sizeBefore: number = this.parts.size
    this.parts.add(data)

    if (sizeBefore === this.parts.size) {
      // We scanned a string we already have in our cache, ignoring it and starting scan again.
      this.startScan()

      return undefined
    }

    this.ngZone.run(() => {
      this.iacService
        .handleRequest(data, IACMessageTransport.QR_SCANNER, (progress: number) => {
          this.isMultiQr = true
          this.percentageScanned = progress ?? 0
          this.startScan()
        })
        .then((result: IACHandlerStatus) => {
          if (result === IACHandlerStatus.SUCCESS) {
            // this.navigationService
            //   .route('/')
            //   .then(() => {
            this.resetScannerPage()
            this.stopScan()
            // })
            // .catch(handleErrorLocal(ErrorCategory.IONIC_NAVIGATION))
          }
        })
        .catch(handleErrorLocal(ErrorCategory.SCHEME_ROUTING))
    })
  }
}
