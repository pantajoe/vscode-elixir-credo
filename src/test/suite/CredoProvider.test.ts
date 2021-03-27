import * as vscode from 'vscode';
import * as cp from 'child_process';
import { createSandbox, SinonSandbox, SinonSpy, assert as sinonAssert } from 'sinon';
import { expect } from 'chai';
import { def } from 'bdd-lazy-var/global';
import * as configurationModule from '../../configuration';
import { CredoProvider } from '../../CredoProvider';
import { CredoInformation, CredoOutput } from '../../CredoOutput';

declare let $diagnosticCollection: vscode.DiagnosticCollection;
declare let $credoProvider: CredoProvider;
declare let $workspaceFilePath: string;
declare let $fileName: string;
declare let $documentUri: vscode.Uri;
declare let $textDocument: vscode.TextDocument;
declare let $credoOutput: CredoOutput;
declare let $credoInfoOutput: CredoInformation;

describe('CredoProvider', () => {
  let sandbox: SinonSandbox;
  def('diagnosticCollection', () => vscode.languages.createDiagnosticCollection('elixir'));
  def('credoProvider', () => new CredoProvider({ diagnosticCollection: $diagnosticCollection }));

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  context('#execute', () => {
    def('workspaceFilePath', () => '/Users/bot/sample');
    def('fileName', () => `${$workspaceFilePath}/lib/sample_web/telemetry.ex`);
    def('documentUri', () => vscode.Uri.file($fileName));
    def('textDocument', () => ({
      languageId: 'elixir',
      isUntitled: false,
      uri: $documentUri,
      fileName: $fileName,
      getText: () => 'defmodule SampleWeb.Telemtry\n@var 2\nend\n',
    }));
    def('credoOutput', () => ({
      issues: [{
        category: 'readability',
        check: 'Credo.Check.Readability.ModuleDoc',
        column: 11,
        column_end: 32,
        filename: 'lib/sample_web/telemetry.ex',
        line_no: 1,
        message: 'Modules should have a @moduledoc tag.',
        priority: 1,
        trigger: 'SampleWeb.Telemetry',
      }],
    }));
    def('credoInfoOutput', () => ({
      config: {
        checks: [],
        files: [
          'lib/sample_web/telemetry.ex',
        ],
      },
      system: {
        credo: '1.5.4-ref.main.9fe4739+uncommittedchanges',
        elixir: '1.11.1',
        erlang: '23',
      },
    }));

    let setDiagnosticCollectionSpy: SinonSpy;
    const execute = () => $credoProvider.execute($textDocument);

    beforeEach(() => {
      setDiagnosticCollectionSpy = sandbox.spy($diagnosticCollection, 'set');
      sandbox.stub(vscode.workspace, 'getWorkspaceFolder').withArgs($documentUri).callsFake(() => ({
        name: 'phoenix-project',
        index: 0,
        uri: vscode.Uri.file($workspaceFilePath),
      }));
      sandbox
        .stub(cp, 'execFile')
        .callsFake((_command, commandArguments, _options, callback) => {
          if (callback) {
            if (commandArguments?.includes('info')) {
              callback(null, JSON.stringify($credoInfoOutput), '');
            } else {
              callback(null, JSON.stringify($credoOutput), '');
            }
          }

          return { kill: () => {} } as cp.ChildProcess;
        });
    });

    context('when lintEverything is true', () => {
      beforeEach(() => {
        sandbox.stub(configurationModule, 'getConfig').callsFake(() => ({
          command: 'mix',
          onSave: true,
          configurationFile: '.credo.exs',
          credoConfiguration: 'default',
          strictMode: false,
          ignoreWarningMessages: false,
          lintEverything: true,
        }));
      });

      it('correctly sets a diagnostic collection for the current document', () => {
        execute();

        sinonAssert.calledWith(
          setDiagnosticCollectionSpy,
          $documentUri,
          [new vscode.Diagnostic(
            new vscode.Range(0, 10, 0, 31),
            'Modules should have a @moduledoc tag. (readability:Credo.Check.Readability.ModuleDoc)',
            vscode.DiagnosticSeverity.Information,
          )],
        );
        expect(setDiagnosticCollectionSpy.calledOnce).to.true;
      });
    });

    context('when the extension only lints the files specified through the credo configuration file', () => {
      beforeEach(() => {
        sandbox.stub(configurationModule, 'getConfig').callsFake(() => ({
          command: 'mix',
          onSave: true,
          configurationFile: '.credo.exs',
          credoConfiguration: 'default',
          strictMode: false,
          ignoreWarningMessages: false,
          lintEverything: false,
        }));
      });

      context('when the current document should be linted', () => {
        it('adds the diagnostic', () => {
          execute();

          sinonAssert.calledWith(
            setDiagnosticCollectionSpy,
            $documentUri,
            [new vscode.Diagnostic(
              new vscode.Range(0, 10, 0, 31),
              'Modules should have a @moduledoc tag. (readability:Credo.Check.Readability.ModuleDoc)',
              vscode.DiagnosticSeverity.Information,
            )],
          );
          expect(setDiagnosticCollectionSpy.calledOnce).to.true;
        });
      });

      context('when the current document should not be linted', () => {
        def('fileName', () => `${$workspaceFilePath}/lib/sample_web/telemetry_test.ex`);

        it('does not add any diagnostic', () => {
          execute();

          sinonAssert.calledWith(
            setDiagnosticCollectionSpy,
            $documentUri,
            [],
          );
          expect(setDiagnosticCollectionSpy.calledOnce).to.true;
        });
      });
    });
  });

  context('#isOnSave', () => {
    context('when the onSave flag in the extension\'s configuration is on', () => {
      beforeEach(() => {
        sandbox.stub(configurationModule, 'getConfig').callsFake(() => ({
          command: 'mix',
          onSave: true,
          configurationFile: '.credo.exs',
          credoConfiguration: 'default',
          strictMode: false,
          ignoreWarningMessages: false,
          lintEverything: false,
        }));
      });

      it('returns true', () => {
        expect($credoProvider.isOnSave).to.equal(true);
      });
    });

    context('when the onSave flag in the extension\'s configuration is off', () => {
      beforeEach(() => {
        sandbox.stub(configurationModule, 'getConfig').callsFake(() => ({
          command: 'mix',
          onSave: false,
          configurationFile: '.credo.exs',
          credoConfiguration: 'default',
          strictMode: false,
          ignoreWarningMessages: false,
          lintEverything: false,
        }));
      });

      it('returns false', () => {
        expect($credoProvider.isOnSave).to.equal(false);
      });
    });
  });
});
