import { Component, Inject } from '@angular/core'
import { APP_INFO_PLUGIN, AppInfoPlugin } from '@airgap/angular-core'
import { Platform } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'

import { BLACKOUT } from '../../config/brand'
import { ErrorCategory, handleErrorLocal } from '../../services/error-handler/error-handler.service'
import { NavigationService } from '../../services/navigation/navigation.service'

@Component({
  selector: 'blackout-about',
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss']
})
export class AboutPage {
  public appName: string = BLACKOUT.name
  public packageName: string = BLACKOUT.appId
  public versionName: string = BLACKOUT.version
  public versionCode: string | number | undefined

  constructor(
    @Inject(APP_INFO_PLUGIN) private readonly appInfo: AppInfoPlugin,
    private readonly platform: Platform,
    private readonly navigationService: NavigationService,
    private readonly translate: TranslateService
  ) {
    this.updateVersions().catch(handleErrorLocal(ErrorCategory.CORDOVA_PLUGIN))
  }

  public async updateVersions(): Promise<void> {
    if (this.platform.is('hybrid')) {
      const info = await this.appInfo.get()
      this.appName = info.appName
      this.packageName = info.packageName
      this.versionName = info.versionName
      this.versionCode = info.versionCode
    }
  }

  public github(): void {
    this.openLinkPage('GitHub', BLACKOUT.repository)
  }

  public documentation(): void {
    this.openLinkPage(this.translate.instant('tab-settings.documentation_label'), BLACKOUT.documentation)
  }

  private openLinkPage(title: string, link: string): void {
    this.navigationService
      .routeWithState('/link-page', { title, link, urlDescription: link })
      .catch(handleErrorLocal(ErrorCategory.IONIC_NAVIGATION))
  }
}
