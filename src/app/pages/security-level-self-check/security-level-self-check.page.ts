import { Component, OnInit } from '@angular/core'

@Component({
  selector: 'airgap-security-level-self-check',
  templateUrl: './security-level-self-check.page.html',
  styleUrls: ['./security-level-self-check.page.scss']
})
export class SecurityLevelSelfCheckPage implements OnInit {
  checkPhrases: string[] = [
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

  constructor() {}

  ngOnInit() {}
}
