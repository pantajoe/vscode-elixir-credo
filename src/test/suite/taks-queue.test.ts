import * as vscode from 'vscode';
import { expect } from 'chai';
import { TaskQueue, Task, TaskToken } from '../../task-queue';

class TestTaskWrapper {
  public readonly url: vscode.Uri;

  public readonly task: Task;

  public token?: TaskToken;

  public isBodyCalled: boolean = false;

  public isCancelCallbackCalled: boolean = false;

  constructor(url: vscode.Uri) {
    this.url = url;
    this.task = new Task(url, (taskToken: TaskToken) => {
      this.isBodyCalled = true;
      this.token = taskToken;
      return () => {
        this.isCancelCallbackCalled = true;
      };
    });
  }
}

declare let $queue: TaskQueue;
declare let $taskWrapper: TestTaskWrapper;
declare let $taskWrapper2: TestTaskWrapper;
declare let $taskWrapper3: TestTaskWrapper;
declare let $anotherTaskWrapper: TestTaskWrapper;

describe('TaskQueue', () => {
  def('queue', () => new TaskQueue());
  def('taskWrapper', () => new TestTaskWrapper(vscode.Uri.file('/path/to/file')));
  def('taskWrapper2', () => new TestTaskWrapper(vscode.Uri.file('/path/to/file2')));

  context('when one task is added to queue', () => {
    it('calles body', () => {
      $queue.enqueue($taskWrapper.task);
      expect($taskWrapper.isBodyCalled).to.be.true;
      expect($taskWrapper.token?.isCanceled).to.be.false;
      expect($queue.length).to.eq(1);
    });

    it('can cancel running task', (done) => {
      $queue.enqueue($taskWrapper.task);
      $queue.cancel($taskWrapper.url);
      expect($taskWrapper.isCancelCallbackCalled).to.be.true;
      expect($taskWrapper.token?.isCanceled).to.be.true;
      setTimeout(() => {
        expect($queue.length).to.eq(0);
        done();
      }, 0);
    });

    it('can finish task by calling finished()', (done) => {
      $queue.enqueue($taskWrapper.task);
      $taskWrapper.token?.finished();
      setTimeout(() => {
        expect($queue.length).to.eq(0);
        done();
      }, 0);
    });
  });

  context('when multiple tasks with different urls are added to queue', () => {
    it('calles body of only first task', () => {
      $queue.enqueue($taskWrapper.task);
      $queue.enqueue($taskWrapper2.task);
      expect($taskWrapper.isBodyCalled).to.be.true;
      expect($taskWrapper2.isBodyCalled).to.be.false;
      expect($queue.length).to.eq(2);
    });

    it('run next task when first one is canceled', (done) => {
      $queue.enqueue($taskWrapper.task);
      $queue.enqueue($taskWrapper2.task);
      expect($taskWrapper2.isBodyCalled).to.be.false;
      $queue.cancel($taskWrapper.url);
      setTimeout(() => {
        expect($taskWrapper2.isBodyCalled).to.be.true;
        expect($queue.length).to.eq(1);
        done();
      }, 0);
    });

    it('run next task when first one is finished', (done) => {
      $queue.enqueue($taskWrapper.task);
      $queue.enqueue($taskWrapper2.task);
      expect($taskWrapper2.isBodyCalled).to.be.false;
      $taskWrapper.token?.finished();
      setTimeout(() => {
        expect($taskWrapper2.isBodyCalled).to.be.true;
        expect($queue.length).to.eq(1);
        done();
      }, 0);
    });

    context('when selecting next task', () => {
      def('taskWrapper3', () => new TestTaskWrapper(vscode.Uri.file('/path/to/file3')));

      it('skip canceled task on selecting next task', (done) => {
        $queue.enqueue($taskWrapper.task);
        $queue.enqueue($taskWrapper2.task);
        $queue.enqueue($taskWrapper3.task);
        $queue.cancel($taskWrapper2.url);
        $taskWrapper.token?.finished();
        setTimeout(() => {
          expect($taskWrapper2.isBodyCalled).to.be.false;
          expect($queue.length).to.eq(1);
          expect($taskWrapper3.isBodyCalled).to.be.true;
          done();
        }, 0);
      });
    });
  });

  context('when multiple tasks with same url are added to queue', () => {
    def('anotherTaskWrapper', () => new TestTaskWrapper($taskWrapper.url));

    it('cancels former task', (done) => {
      $queue.enqueue($taskWrapper.task);
      expect($taskWrapper.isCancelCallbackCalled).to.be.false;
      $queue.enqueue($anotherTaskWrapper.task);
      expect($taskWrapper.isCancelCallbackCalled).to.be.true;
      setTimeout(() => {
        expect($anotherTaskWrapper.isBodyCalled).to.be.true;
        expect($queue.length).to.eq(1);
        done();
      }, 0);
    });
  });

  context('when same task is enqueued twice', () => {
    it('throws error', () => {
      expect(() => {
        $queue.enqueue($taskWrapper.task);
        $queue.enqueue($taskWrapper.task);
      }).to.throw();
    });
  });
});
