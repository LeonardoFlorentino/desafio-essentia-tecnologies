import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Task } from './task.model';
import { TaskListPage } from './task-list-page';

const tasks: Task[] = [
  {
    id: 2,
    title: 'Call the client',
    description: null,
    completed: true,
    createdAt: '2026-10-22T13:00:00.000Z',
    updatedAt: '2026-10-22T13:00:00.000Z',
  },
  {
    id: 1,
    title: 'Write the report',
    description: 'Quarterly numbers',
    completed: false,
    createdAt: '2026-10-22T12:00:00.000Z',
    updatedAt: '2026-10-22T12:00:00.000Z',
  },
];

describe('TaskListPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TaskListPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('loads the tasks from the API and shows every one of them', async () => {
    const fixture = TestBed.createComponent(TaskListPage);
    fixture.detectChanges();

    TestBed.inject(HttpTestingController).expectOne('/api/tasks').flush(tasks);
    await fixture.whenStable();

    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('li');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Call the client');
    expect(items[0].textContent).toContain('Concluída');
    expect(items[1].textContent).toContain('Write the report');
    expect(items[1].textContent).toContain('Quarterly numbers');
    expect(items[1].textContent).toContain('Pendente');
  });
});
