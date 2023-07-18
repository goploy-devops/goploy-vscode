import * as vscode from 'vscode';
import axios from 'axios';
import * as sidebar from './src/sidebar';
import {
  DeployPreviewList,
  DeployPublish,
  DeployProgress,
  DeployRebuild,
} from './src/api/deploy';
import {
  CommitData,
  RepositoryBranchList,
  RepositoryCommitList,
  RepositoryTagList,
} from './src/api/repository';
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
    }
  }

  //注册侧边栏面板的实现
  const treeProvider = new sidebar.TreeDataProvider();
  vscode.window.registerTreeDataProvider("namespace", treeProvider);

  context.subscriptions.push(vscode.commands.registerCommand('extension.openSettings', () => {
    vscode.commands.executeCommand('workbench.action.openSettings', 'goploy');
  }));
  context.subscriptions.push(vscode.commands.registerCommand("namespace.refreshEntry", () => treeProvider.refresh()));
  context.subscriptions.push(vscode.commands.registerCommand("namespace.runEntry", runEntry));
  context.subscriptions.push(vscode.commands.registerCommand("namespace.branchEntry", branchEntry));
  context.subscriptions.push(vscode.commands.registerCommand("namespace.tagEntry", tagEntry));
  context.subscriptions.push(vscode.commands.registerCommand("namespace.rebuildEntry", rebuildEntry));
  context.subscriptions.push(vscode.commands.registerCommand("namespace.resultEntry", resultEntry));
}

export function deactivate() { }

async function branchEntry({ id, label }: { id: string, label: string }) {
  const [namespaceId, projectId] = id.split("-");
  const options = await new RepositoryBranchList({ id: Number(projectId) }, Number(namespaceId))
    .request()
    .then(response => response.data.list.filter((element) => {
      return element.indexOf('HEAD') === -1;
    }));
  const selectedBranch = await vscode.window.showQuickPick(options, {
    placeHolder: 'Select an branch',
  });

  if (selectedBranch) {
    const options: vscode.QuickPickItem[] = await new RepositoryCommitList({ id: Number(projectId), branch: selectedBranch }, Number(namespaceId))
      .request()
      .then(response => response.data.list.map(item => {
        return { label: item.commit, description: item.message };
      }));


    const selectedCommit = await vscode.window.showQuickPick(options, {
      placeHolder: 'Select an commit',
      matchOnDescription: true,
    });

    if (selectedCommit) {
      await runEntry({ id, label, branch: selectedBranch, commit: selectedCommit.label });
    }
  }
}

async function tagEntry({ id, label }: { id: string, label: string }) {
  const [namespaceId, projectId] = id.split("-");
  let tagList: CommitData[] = [];
  const options: vscode.QuickPickItem[] = await new RepositoryTagList({ id: Number(projectId) }, Number(namespaceId))
    .request()
    .then(response => {
      tagList = response.data.list;
      return response.data.list.map(item => {
        return { label: item.tag, description: item.message };
      });
    });


  const selectedTag = await vscode.window.showQuickPick(options, {
    placeHolder: options.length > 0 ? 'Select an tag' : 'Tag not found',
    matchOnDescription: true,
  });

  if (selectedTag) {
    const tag = tagList.find(item => item.tag === selectedTag.label);
    if (tag) {
      await runEntry({ id, label, branch: tag.branch, commit: tag.commit });
    }
  }

}


let deployingProjects: Record<string, string> = {};
async function runEntry({ id, label, branch, commit }: { id: string, label: string, branch: string, commit: string }) {
  const [namespaceId, projectId] = id.split("-");
  if (deployingProjects[projectId]) {
    vscode.window.showWarningMessage('Wait for the previous task to finish');
    return;
  }
  deployingProjects[projectId] = await new DeployPublish(
    {
      projectId: Number(projectId),
      branch,
      commit
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
          vscode.window.showInformationMessage(`Publish ${label} completed`);
          delete deployingProjects[projectId];
          return;
        }
      }, 1000);
    });
  });
}

async function rebuildEntry({ id, label }: { id: string, label: string }) {
  const [namespaceId, projectId] = id.split("-");
  if (deployingProjects[projectId]) {
    vscode.window.showWarningMessage('Wait for the previous task to finish');
    return;
  }

  const options: vscode.QuickPickItem[] = await new DeployPreviewList(
    {
      projectId: Number(projectId),
      page: 1,
      rows: 10,
      state: -1
    }, Number(namespaceId)
  )
    .request()
    .then(response => {
      return response.data.list.map((item) => {
        let state = "$(close)";
        if (item.state !== 0) {
          state = '$(check)';
        }
        return { label: item.token, description: `${item.publisherName}, ${item.updateTime}, ${state}`, detail: item.ext.substring(1, item.ext.length - 1) };
      });
    });
  const selectedToken = await vscode.window.showQuickPick(options, {
    placeHolder: options.length > 0 ? 'Select an token' : 'No results',
    matchOnDescription: true,
  });

  if (!selectedToken) {
    return;
  }
  const data = await new DeployRebuild(
    {
      projectId: Number(projectId),
      token: selectedToken.label,
    }, Number(namespaceId)
  )
    .request()
    .then((response) => response.data);

  if (data.type === 'symlink') {
    vscode.window.showInformationMessage(`Rebuild ${label} completed`);
    return;
  }
  deployingProjects[projectId] = data.token;
  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: `Rebuilding ${label}`
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
          vscode.window.showInformationMessage(`Rebuild ${label} completed`);
          delete deployingProjects[projectId];
          return;
        }
      }, 1000);
    });
  });
}

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
          opc.appendLine(`${item.ext.substring(1, item.ext.length - 1)}, ${item.publisherName}, ${item.updateTime}, ${state}`);
        });
      }
    });
}
