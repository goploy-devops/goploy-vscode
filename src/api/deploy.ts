import { Request, Pagination, Total, ID } from './types';
import { ProjectData } from './project';

export interface PublishTraceData {
  id: number
  token: string
  projectId: number
  projectName: string
  detail: string
  state: number
  publisherId: number
  publisherName: string
  type: number
  ext: string
  serverName: string
  insertTime: string
  updateTime: string
}

export interface PublishTraceExt {
  branch: string
  commit: string
  message: string
  author: string
  timestamp: number
  diff: string
  script: string
  command: string
}

export class DeployList extends Request {
  readonly url = '/deploy/getList';
  readonly method = 'get';
  public namespaceId: number;
  public declare datagram: {
    list: ProjectData[]
  };

  constructor(namespaceId: number) {
    super();
    this.namespaceId = namespaceId;
  }
}

export class DeployPreviewList extends Request {
  readonly url = '/deploy/getPreview';
  readonly method = 'get';
  public namespaceId: number;
  public param: {
    projectId: number
    state: number
    page: number
    rows: number
  };

  public declare datagram: {
    list: PublishTraceData[]
    pagination: Pagination & Total
  };

  constructor(param: DeployPreviewList['param'], namespaceId: number) {
    super();
    this.namespaceId = namespaceId;
    this.param = { ...param };
  }
}
