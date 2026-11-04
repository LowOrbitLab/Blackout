import { Injectable } from '@angular/core'

import { ErrorCategory, handleErrorLocal } from './../error-handler/error-handler.service'
import { SecureStorage } from './secure-storage.service'

const STORAGE_PREFIX = 'blackout:secure:'

@Injectable({
  providedIn: 'root'
})
export class SecureStorageServiceMock {
  public isSecure = 1

  constructor() {
    console.log('SecureStorageServiceMock constructor')
  }

  public isDeviceSecure(): Promise<any> {
    return new Promise<any>((resolve) => {
      console.warn('SecureStorageServiceMock - This Device is NOT secured')
      resolve({ value: this.isSecure })
    })
  }

  public secureDevice(): Promise<void> {
    return new Promise<void>((resolve) => {
      console.warn('SecureStorageServiceMock - This Device is NOT secured')
      resolve()
    })
  }

  public get(alias: string, _isParanoia: boolean): Promise<SecureStorage> {
    console.log('SecureStorageServiceMock - creating new storage', alias)
    const storageKey = (key: string) => `${STORAGE_PREFIX}${encodeURIComponent(alias)}:${encodeURIComponent(key)}`
    const secureStorage: SecureStorage = {
      init() {
        console.warn('SecureStorageServiceMock - init')

        return new Promise<void>((resolve) => {
          resolve()
        })
      },
      setItem(key: string, value: string): Promise<void> {
        localStorage.setItem(storageKey(key), value)

        return new Promise<void>((resolve) => {
          resolve()
        })
      },
      getItem(key: string): Promise<any> {
        console.warn('SecureStorageServiceMock - getItem', key)
        const result = localStorage.getItem(storageKey(key))

        return new Promise<any>((resolve) => {
          resolve({ value: result })
        })
      },
      setupRecoveryPassword(key: string, value: string): Promise<any> {
        const recoverString = '' // TODO: mock it
        localStorage.setItem(storageKey(key + '_' + recoverString), value)

        return new Promise<any>((resolve) => {
          resolve(recoverString)
        })
      },
      removeItem(key) {
        console.warn('SecureStorageServiceMock - removeItem', key)
        localStorage.removeItem(storageKey(key))

        return new Promise<any>((resolve) => {
          resolve({})
        })
      }
    }

    return new Promise<SecureStorage>((resolve) => {
      secureStorage
        .init()
        .then(() => {
          resolve(secureStorage)
        })
        .catch(handleErrorLocal(ErrorCategory.SECURE_STORAGE))
    })
  }

  public wipe() {
    console.log(`Deleting "secure storage" (browser).`)
    // 只清理本应用的命名空间，保留同源的其他应用或测试数据。
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index)
      if (key?.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key)
    }
  }
}
