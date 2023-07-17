import { Request, Pagination, ID, Total } from './types';

export interface ProjectScript {
  afterPull: { mode: string; content: string }
  afterDeploy: { mode: string; content: string }
  deployFinish: { mode: string; content: string }
}

export interface ProjectData {
  [key: string]: any
  id: number
  namespaceId: number
  userId: number
  name: string
  repoType: string
  url: string
  path: string
  environment: number
  branch: string
  label: string
  symlinkPath: string
  symlinkBackupNumber: number
  review: number
  reviewURL: string
  script: ProjectScript
  afterPullScriptMode: string
  afterPullScript: string
  afterDeployScriptMode: string
  afterDeployScript: string
  transferType: string
  transferOption: string
  deployServerMode: string
  autoDeploy: number
  publisherId: number
  publisherName: string
  publishExt: string
  deployState: number
  lastPublishToken: string
  notifyType: number
  notifyTarget: string
  serverIds: number[]
  userIds: number[]
  state: number
  insertTime: string
  updateTime: string
}

export class ProjectList extends Request {
  readonly url = '/project/getList';
  readonly method = 'get';

  public declare datagram: {
    list: ProjectData[]
  };
}
