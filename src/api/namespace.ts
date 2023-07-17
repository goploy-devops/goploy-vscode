import { Request } from './types';

export interface NamespaceUserData {
  id: number
  namespaceId: number
  namespaceName: string
  userId: number
  userName: string
  roleId: number
  roleName: string
  insertTime: string
  updateTime: string
}

export class NamespaceOption extends Request {
  readonly url = '/namespace/getOption';
  readonly method = 'get';
  public namespaceId = 0;
  public declare datagram: {
    list: NamespaceUserData[]
  };
}
