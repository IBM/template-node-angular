import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-ui-shell',
  templateUrl: './ui-shell.component.html',
  styleUrls: ['./ui-shell.component.scss']
})
export class UiShellComponent implements OnInit {

  constructor() { }

  options = [
    {
      content: 'Option 1',
      value: 1,
    },
    {
      content: 'Option 2',
      value: 2,
    },
    {
      content: 'Option 3',
      value: 3,
    },
  ];

  ngOnInit() {
  }

  menuClicked() { }
}
