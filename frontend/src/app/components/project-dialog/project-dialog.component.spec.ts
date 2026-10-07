import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ProjectDialogComponent } from './project-dialog.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('ProjectDialogComponent', () => {
  let component: ProjectDialogComponent;
  let fixture: ComponentFixture<ProjectDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ProjectDialogComponent>>;

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ProjectDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { isEdit: false } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should validate form and save project data', () => {
    component.name = 'Test Project';
    component.basePath = '/tmp/test';
    component.template = 'PersonDays';
    component.defaultTasks = ['Task 1', 'Task 2'];

    expect(component.isValid()).toBeTrue();

    component.save();

    expect(dialogRefSpy.close).toHaveBeenCalledWith({
      name: 'Test Project',
      basePath: '/tmp/test',
      template: 'PersonDays',
      defaultTasks: ['Task 1', 'Task 2']
    });
  });
});
