import { Component, OnInit } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { LanguagesType, VaultStorageKey, VaultStorageService } from 'src/app/services/storage/storage.service'

import { NavigationService } from '../../services/navigation/navigation.service'

@Component({
  selector: 'airgap-languages-selection-settings',
  templateUrl: './languages-selection-settings.page.html',
  styleUrls: ['./languages-selection-settings.page.scss']
})
export class LanguagesSelectionSettingsPage implements OnInit {
  public languageType: typeof LanguagesType = LanguagesType
  public initialType: LanguagesType | undefined
  public selectedType: LanguagesType | undefined
  public isEdit: boolean = false

  public get languages(): LanguagesType[] {
    return Object.values(LanguagesType)
  }

  public get isDeviceLanguageSelected(): boolean {
    return this.selectedType === this.getNormalizedBrowserLanguage()
  }

  constructor(
    private readonly translateService: TranslateService,
    private readonly navigationService: NavigationService,
    private readonly storageService: VaultStorageService
  ) {}

  public async ngOnInit(): Promise<void> {
    const currentLanguage = await this.getCurrentLanguage()
    await this.applyLanguage(currentLanguage, false)
  }

  public async getCurrentLanguage(): Promise<LanguagesType> {
    const savedLanguage = await this.storageService.get(VaultStorageKey.LANGUAGE_TYPE)
    const deviceLanguage = this.getNormalizedBrowserLanguage()

    return savedLanguage || deviceLanguage || LanguagesType.EN
  }

  public async defaultToDevice(): Promise<void> {
    const deviceLanguage = this.getNormalizedBrowserLanguage()
    await this.changeLanguage(deviceLanguage)
  }

  private getNormalizedBrowserLanguage(): LanguagesType {
    const rawBrowserLang = this.translateService.getBrowserLang()
    if (rawBrowserLang === 'zh') {
      return LanguagesType.ZH_CN
    }
    if (rawBrowserLang === 'pt') {
      return LanguagesType.PT_BR
    }
    if (Object.values(LanguagesType).includes(rawBrowserLang as LanguagesType)) {
      return rawBrowserLang as LanguagesType
    }

    return LanguagesType.EN
  }

  public async changeLanguage(language: LanguagesType): Promise<void> {
    if (!language) {
      return
    }
    await this.applyLanguage(language, true)
  }

  private async applyLanguage(language: LanguagesType, persist: boolean): Promise<void> {
    this.selectedType = language
    await this.translateService.use(language).toPromise()
    if (persist) {
      await this.storageService.set(VaultStorageKey.LANGUAGE_TYPE, language)
    }
  }

  public goToNextPage(): void {
    if (this.selectedType) {
      this.storageService.set(VaultStorageKey.LANGUAGE_TYPE, this.selectedType)
    }
    this.navigationService.back()
  }
}
