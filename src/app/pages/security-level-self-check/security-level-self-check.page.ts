import { Component, OnInit } from '@angular/core'

const SELF_CHECK_STORAGE_KEY = 'blackout_security_self_check_state'

@Component({
  selector: 'blackout-security-level-self-check',
  templateUrl: './security-level-self-check.page.html',
  styleUrls: ['./security-level-self-check.page.scss']
})
export class SecurityLevelSelfCheckPage implements OnInit {
  public checkPhrases: string[] = [
    'security-level-self-check.check_1',
    'security-level-self-check.check_2',
    'security-level-self-check.check_3',
    'security-level-self-check.check_4',
    'security-level-self-check.check_5',
    'security-level-self-check.check_6',
    'security-level-self-check.check_7',
    'security-level-self-check.check_8',
    'security-level-self-check.check_9',
    'security-level-self-check.check_10'
  ]

  public checkedItems: boolean[] = new Array(this.checkPhrases.length).fill(false)

  public get checkedCount(): number {
    return this.checkedItems.filter(Boolean).length
  }

  public get progressPercentage(): number {
    return Math.round((this.checkedCount / this.checkPhrases.length) * 100)
  }

  constructor() {}

  public ngOnInit(): void {
    try {
      const saved = localStorage.getItem(SELF_CHECK_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === this.checkPhrases.length) {
          this.checkedItems = parsed.map(Boolean)
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }

  public onCheckChange(index: number, event: Event): void {
    const checked = Boolean((event as CustomEvent).detail?.checked)
    this.checkedItems[index] = checked
    try {
      localStorage.setItem(SELF_CHECK_STORAGE_KEY, JSON.stringify(this.checkedItems))
    } catch {
      // Ignore storage write errors
    }
  }
}
