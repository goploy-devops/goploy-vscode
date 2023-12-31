// 接口响应通过格式
import Axios from './axios';
import { Method, AxiosRequestConfig } from 'axios';
import * as vscode from 'vscode';
export interface HttpResponse<T> {
  code: number
  message: string
  data: T
}

export interface Pagination {
  page: number
  rows: number
}

export interface Total {
  total: number
}

export interface ID {
  id: number
}

export abstract class Request {
  abstract url: string;
  abstract method: Method;
  public timeout = 5000;
  public namespaceId: number;
  public param!: ID | Record<string, unknown>;
  public datagram!: any;

  constructor(namespaceId: number) {
    this.namespaceId = namespaceId;
  }

  public request(): Promise<HttpResponse<this['datagram']>> {
    const vsConfig = vscode.workspace.getConfiguration('goploy');
    const domain = vsConfig.get<string>('domain');
    const config: AxiosRequestConfig = {
      url: this.url + `?G-N-ID=${this.namespaceId}`,
      baseURL: domain,
      method: this.method,
      timeout: this.timeout,
    };
    if (this.method.toLowerCase() === 'get') {
      config.params = { ...this.param };
    } else {
      config.data = { ...this.param };
    }
    return Axios.request(config);
  }
}
