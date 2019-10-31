import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-table-list',
  templateUrl: './table-list.component.html',
  styleUrls: ['./table-list.component.scss']
})
export class TableListComponent implements OnInit {
  public selected = {};
  public data = [
    {
      Name: 'Lin',
      Address: '123 Main Street',
      City: 'Austin',
      State: 'TX',
      ZipCode: '12345',
      Country: 'United States'
    },
    {
      Name: 'Mak',
      Address: '45 2nd Street',
      City: 'Austin',
      State: 'TX',
      ZipCode: '78766',
      Country: 'United States'
    },
    {
      Name: 'Joe',
      Address: '40 Down Street',
      City: 'San Francisco',
      State: 'CA',
      ZipCode: '90706',
      Country: 'United States'
    }
  ];

  constructor() { }

  ngOnInit() {
  }

  onSelected(obj) {
    this.selected = obj;
  }

}
