import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-ui-shell',
  templateUrl: './ui-shell.component.html',
  styleUrls: ['./ui-shell.component.scss']
})
export class UiShellComponent implements OnInit {

  constructor() { }

  patternName = 'Display Form';

  ngOnInit() { }

  menuClicked() { }

  onSelect(name: string) {
    this.patternName = name;
  }
}
