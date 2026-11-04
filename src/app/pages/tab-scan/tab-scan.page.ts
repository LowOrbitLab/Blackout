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

const PROGRESS_SEGMENTS: number = 8

@Component({
  selector: 'blackout-tab-scan',
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

  public readonly progressSegments: number[] = Array.from({ length: PROGRESS_SEGMENTS }, (_, i) => i)

  public torchAvailable: boolean = false
  public torchEnabled: boolean = false

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

  /** Fill ratio (0..1) of a progress segment, so the last active segment fills smoothly. */
  public segmentFill(index: number): number {
    return Math.min(1, Math.max(0, this.percentageScanned * PROGRESS_SEGMENTS - index))
  }

  /** Reported by zxing in the browser / Electron once the active camera is known. */
  public onTorchCompatible(compatible: boolean): void {
    this.torchAvailable = compatible
    if (!compatible) {
      this.torchEnabled = false
    }
  }

  public toggleTorch(): void {
    const next: boolean = !this.torchEnabled
    const nativeScanner = this.nativeScanner
    if (this.isMobile && nativeScanner) {
      const done = (error: unknown) => this.ngZone.run(() => (this.torchEnabled = error ? this.torchEnabled : next))
      if (next) {
        nativeScanner.enableLight(done)
      } else {
        nativeScanner.disableLight(done)
      }
    } else {
      // Bound to [torch] on <zxing-scanner>
      this.torchEnabled = next
    }
  }

  async ionViewWillLeave() {
    this.switchOffTorch()
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

  public ionViewDidEnter(): void {
    super.ionViewDidEnter()
    this.refreshNativeTorchAvailability()
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

  /** cordova-plugin-qrscanner global, present only in the native app. */
  private get nativeScanner(): NativeQrScanner | undefined {
    return (window as unknown as { QRScanner?: NativeQrScanner }).QRScanner
  }

  private refreshNativeTorchAvailability(): void {
    const nativeScanner = this.nativeScanner
    if (!this.isMobile || !nativeScanner) {
      return
    }
    // The camera is prepared asynchronously after scan() starts; ask once it has settled.
    setTimeout(() => {
      nativeScanner.getStatus((status) => this.ngZone.run(() => (this.torchAvailable = !!status?.canEnableLight)))
    }, 800)
  }

  private switchOffTorch(): void {
    if (!this.torchEnabled) {
      return
    }
    this.torchEnabled = false
    const nativeScanner = this.nativeScanner
    if (this.isMobile && nativeScanner) {
      nativeScanner.disableLight(() => undefined)
    }
  }
}

interface NativeQrScanner {
  enableLight(callback: (error: unknown, status?: unknown) => void): void
  disableLight(callback: (error: unknown, status?: unknown) => void): void
  getStatus(callback: (status: { canEnableLight?: boolean } | undefined) => void): void
}
