import * as vscode from 'vscode';
import axios from 'axios';
import * as sidebar from './src/sidebar';
import {
  DeployPreviewList,
  DeployPublish,
  DeployProgress,
} from './src/api/deploy';
const opc = vscode.window.createOutputChannel('Goploy'); // 可以有多个OutputChannel共存，使用参数名区分

export async function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('goploy');
  const apiKey = config.get('apiKey');
  if (!apiKey) {
    const userInput = await vscode.window.showInputBox({
      prompt: 'Enter your api key',
      placeHolder: 'your can find it in the goploy user center'
    });
    if (userInput) {
      await config.update('apiKey', userInput, vscode.ConfigurationTarget.Global);
    } else {
      vscode.window.showWarningMessage('Please configure goploy.apikey to use this extension.');
      return;
    }
  }

  const domain = config.get('domain');
  if (!domain) {
    const userInput = await vscode.window.showInputBox({
      prompt: 'Enter your goploy domain',
      placeHolder: 'https://example.com'
    });
    if (userInput) {
      await config.update('domain', userInput, vscode.ConfigurationTarget.Global);
    } else {
      vscode.window.showWarningMessage('Please configure goploy.apikey to use this extension.');
      return;
    }
  }

  //注册侧边栏面板的实现
  const treeProvider = new sidebar.TreeDataProvider();
  vscode.window.registerTreeDataProvider("namespace", treeProvider);

  context.subscriptions.push(vscode.commands.registerCommand('extension.openSettings', () => {
    vscode.commands.executeCommand('workbench.action.openSettings', 'goploy');
  }));
  context.subscriptions.push(vscode.commands.registerCommand("sidebar_test_id1.openChild", args => {
    opc.show(); // 打开控制台并切换到OutputChannel tab
  }));
  context.subscriptions.push(vscode.commands.registerCommand("namespace.refreshEntry", () => treeProvider.refresh()));
  context.subscriptions.push(vscode.commands.registerCommand("namespace.runEntry", runEntry));
  context.subscriptions.push(vscode.commands.registerCommand("namespace.resultEntry", resultEntry));
}

export function deactivate() { }

async function resultEntry({ id, label }: { id: string, label: string }) {
  const [namespaceId, projectId] = id.split("-");

  await new DeployPreviewList(
    {
      projectId: Number(projectId),
      page: 1,
      rows: 10,
      state: -1
    }, Number(namespaceId)
  )
    .request()
    .then(response => {
      const list = response.data.list;
      opc.show();
      opc.appendLine(`project: ${label}`);
      if (list.length === 0) {
        opc.appendLine('no results found');
      } else {
        opc.appendLine('commit, publisher, publishTime, state');
        list.forEach((item: any) => {
          let state = "x";
          if (item.state !== 0) {
            state = '✔';
          }
          opc.appendLine(`${item.ext.replaceAll('"', '')}, ${item.publisherName}, ${item.updateTime}, ${state}`);
        });
      }
    });
}

let deployingProjects: Record<string, string> = {};
async function runEntry({ id, label }: { id: string, label: string }) {
  const [namespaceId, projectId] = id.split("-");
  if (deployingProjects[projectId]) {
    vscode.window.showWarningMessage('Wait for the previous task to finish');
    return;
  }
  deployingProjects[projectId] = await new DeployPublish(
    {
      projectId: Number(projectId)
    }, Number(namespaceId)
  )
    .request()
    .then((response) => response.data.token);
  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: `Publishing ${label}`
  }, (progress) => {

    return new Promise<void>((resolve) => {
      const timer = setInterval(async () => {
        const data = await new DeployProgress(
          {
            lastPublishToken: deployingProjects[projectId]
          }, Number(namespaceId)
        )
          .request()
          .then((response) => response.data);
        if (data.state === 1) {
          progress.report({ message: data.stage });
        } else if (data.state === 0) {
          clearInterval(timer);
          resolve();
          vscode.window.showErrorMessage(data.message);
          delete deployingProjects[projectId];
          return;
        } else {
          clearInterval(timer);
          resolve();
          vscode.window.showInformationMessage(`Publish ${label} completed successfully`);
          delete deployingProjects[projectId];
          return;
        }
      }, 1000);
    });
  });
}