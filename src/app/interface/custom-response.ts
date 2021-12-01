import { Server } from './server';
export interface CustomResponse {
  timeStamp: Date;
  satatusCode: number;
  status: string;
  reason: string;
  message: string;
  developerMessage: string;
  data: {servers?: Server[], server?: Server}
}
