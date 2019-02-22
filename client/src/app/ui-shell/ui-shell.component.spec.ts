import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UiShellComponent } from './ui-shell.component';

describe('UiShellComponent', () => {
  let component: UiShellComponent;
  let fixture: ComponentFixture<UiShellComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UiShellComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UiShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
