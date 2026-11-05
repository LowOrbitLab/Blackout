import { ClipboardService } from '@airgap/angular-core'
import { Component, OnInit } from '@angular/core'
import { AlertController } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import { ErrorCategory, handleErrorLocal, LocalErrorLogger } from 'src/app/services/error-handler/error-handler.service'

interface ErrorObject {
  date: number
  title: string
  detail: string
  expanded: boolean
}

@Component({
  selector: 'blackout-error-history',
  templateUrl: './error-history.page.html',
  styleUrls: ['./error-history.page.scss']
})
export class ErrorHistoryPage implements OnInit {
  public errorHistory: ErrorObject[] = []

  constructor(
    private readonly alertController: AlertController,
    private readonly clipboardService: ClipboardService,
    private readonly translateService: TranslateService
  ) {}

  async ngOnInit() {
    this.updateList()
  }

  async updateList() {
    const logger = new LocalErrorLogger()
    this.errorHistory = await (
      await logger.getErrorHistory()
    ).map((error) => ({
      date: error[4],
      title: error[2] ? error[2].split('\n')[0] : '',
      detail: error[2],
      expanded: false
    }))
  }

  public async copyErrorHistory(): Promise<void> {
    if (this.errorHistory.length > 0) {
      const alert: HTMLIonAlertElement = await this.alertController.create({
        header: this.translateService.instant('error-history.copy_alert.header'),
        subHeader: this.translateService.instant('error-history.copy_alert.sub-header'),
        message: this.translateService.instant('error-history.copy_alert.message'),
        inputs: [
          {
            name: 'understood',
            type: 'checkbox',
            label: this.translateService.instant('error-history.copy_alert.understood'),
            value: 'understood',
            checked: false
          }
        ],
        buttons: [
          {
            text: this.translateService.instant('common.cancel_label'),
            role: 'cancel'
          },
          {
            text: this.translateService.instant('error-history.copy_alert.copy_label'),
            handler: async (result: string[]) => {
              if (result.includes('understood')) {
                const errorHistory = await new LocalErrorLogger().getErrorHistoryFormatted()
                // The toast message goes through translate as a key
                this.clipboardService.copyAndShowToast(errorHistory, 'error-history.copied_toast')
              }
            }
          }
        ]
      })
      alert.present().catch(handleErrorLocal(ErrorCategory.IONIC_ALERT))
    } else {
      return this.noErrors()
    }
  }

  async noErrors() {
    const alert: HTMLIonAlertElement = await this.alertController.create({
      header: this.translateService.instant('error-history.no-errors_alert.header'),
      message: this.translateService.instant('error-history.no-errors_alert.message'),
      buttons: [
        {
          text: this.translateService.instant('common.ok_label')
        }
      ]
    })
    alert.present().catch(handleErrorLocal(ErrorCategory.IONIC_ALERT))
  }

  async clearErrors() {
    const alert: HTMLIonAlertElement = await this.alertController.create({
      header: this.translateService.instant('error-history.clear_alert.header'),
      message: this.translateService.instant('error-history.clear_alert.message'),
      buttons: [
        {
          // A destructive confirmation needs a way out other than the backdrop
          text: this.translateService.instant('common.cancel_label'),
          role: 'cancel'
        },
        {
          text: this.translateService.instant('common.ok_label'),
          role: 'destructive',
          handler: () => {
            const logger = new LocalErrorLogger()
            logger.clearAll()
          }
        }
      ]
    })
    alert.present().catch(handleErrorLocal(ErrorCategory.IONIC_ALERT))

    alert.onDidDismiss().then(() => {
      this.updateList()
    })
  }
}
