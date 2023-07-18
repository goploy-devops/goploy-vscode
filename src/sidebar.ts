import * as vscode from 'vscode';
import { NamespaceOption } from './api/namespace';
import { DeployList } from './api/deploy';
// 树节点
export class NamespaceItem extends vscode.TreeItem {
    contextValue = 'namespaceItem';
}

// 树节点
export class NamespaceProjectItem extends vscode.TreeItem {
    contextValue = 'namespaceProjectItem';
}

//树的内容组织管理
export class TreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem>
{
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }
    getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
        if (element) {
            return new Promise<vscode.TreeItem[]>(async (resolve, reject) => {
                try {
                    const response = await new DeployList(Number(element.id)).request();
                    const list = response.data.list;
                    const treeNodes = list.map((item) => {
                        const id = item.id;
                        const label = item.name;
                        const collapsibleState = vscode.TreeItemCollapsibleState.None;
                        const treeNode = new NamespaceProjectItem(label, collapsibleState);
                        treeNode.id = `${element.id}-${id}`;
                        return treeNode;
                    });
                    resolve(treeNodes);
                } catch (error) {
                    reject(error);
                }
            });
        } else { //根节点
            return new Promise<vscode.TreeItem[]>(async (resolve, reject) => {
                try {
                    const response = await new NamespaceOption().request();
                    const list = response.data.list;
                    const treeNodes = list.map((item) => {
                        const id = item.namespaceId;
                        const label = item.namespaceName;
                        const collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
                        const treeNode = new NamespaceItem(label, collapsibleState);
                        treeNode.id = id.toString();
                        return treeNode;
                    });
                    resolve(treeNodes);
                } catch (error) {
                    reject(error);
                }

            });
        }
    }
}