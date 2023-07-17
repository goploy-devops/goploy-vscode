import axios, { AxiosResponse, AxiosError } from 'axios';
import * as vscode from 'vscode';
// create an axios instance
const service = axios.create({
  withCredentials: true, // send cookies when cross-domain requests
  timeout: 60000, // request timeout
});

// request interceptor
service.interceptors.request.use(
  (config: any) => {
    const vsConfig = vscode.workspace.getConfiguration('goploy');
    const apiKey = vsConfig.get('apiKey');
    if (config.headers) {
      config.headers['Router'] = 'vscode';
      config.headers['X-API-KEY'] = apiKey;
    } else {
      config.headers = {
        Router: 'vscode',
        'X-API-KEY': apiKey,
      };
    }
    return config;
  },
  (error: AxiosError) => {
    // do something with request error
    return Promise.reject(error);
  }
);

// response interceptor
service.interceptors.response.use(
  /**
   * Determine the request status by custom code
   * Here is just an example
   * You can also judge the status by HTTP Status Code
   */
  (response: AxiosResponse) => {
    const res = response.data;
    if (res.code !== 0) {
      return Promise.reject(response.data.message);
    } else {
      return res;
    }
  },
  (error: AxiosError) => {
    console.log('err' + error); // for debug
    return Promise.reject(error);
  }
);

export default service;
