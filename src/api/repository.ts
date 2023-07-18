import { Request, ID } from './types';

export interface CommitData {
  branch: string
  commit: string
  author: string
  timestamp: number
  message: string
  tag: string
  diff: string
}

export class RepositoryBranchList extends Request {
  readonly url = '/repository/getBranchList';
  readonly method = 'get';
  readonly timeout = 0;
  public param: ID;

  public declare datagram: {
    list: string[]
  };
  constructor(param: RepositoryBranchList['param'], namespaceId: number) {
    super(namespaceId);
    this.param = { ...param };
  }
}

export class RepositoryCommitList extends Request {
  readonly url = '/repository/getCommitList';
  readonly method = 'get';
  readonly timeout = 0;
  public param: {
    id: number
    branch: string
  };

  public declare datagram: {
    list: CommitData[]
  };
  constructor(param: RepositoryCommitList['param'], namespaceId: number) {
    super(namespaceId);
    this.param = { ...param };
  }
}

export class RepositoryTagList extends Request {
  readonly url = '/repository/getTagList';
  readonly method = 'get';
  readonly timeout = 0;
  public param: ID;

  public declare datagram: {
    list: CommitData[]
  };
  constructor(param: RepositoryTagList['param'], namespaceId: number) {
    super(namespaceId);
    this.param = { ...param };
  }
}
