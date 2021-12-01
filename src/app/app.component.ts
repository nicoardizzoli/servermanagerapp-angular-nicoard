import { Server } from './interface/server';
import { Status } from './enum/status.enum';
import { DataState } from './enum/data-state.enum';
import { CustomResponse } from './interface/custom-response';
import { map, Observable, startWith, catchError, of, BehaviorSubject } from 'rxjs';
import { ServerService } from './service/server.service';
import { Component, OnInit } from '@angular/core';
import { AppState } from './interface/app-state';
import { NgForm } from '@angular/forms';
import { NotifierService } from 'angular-notifier';
import { NotificationService } from './service/notification.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'servermanagerapp';
  appState$: Observable<AppState<CustomResponse>>;

  public readonly dataState = DataState;
  private filterSubject = new BehaviorSubject<string>('');
  private dataSubject = new BehaviorSubject<CustomResponse>(null);
  filterStatus$ = this.filterSubject.asObservable();
  private isLoading = new BehaviorSubject<boolean>(false);
  isLoading$ = this.filterSubject.asObservable();

  constructor(private serverService: ServerService, private notifier: NotificationService){}


  ngOnInit(): void {
      this.appState$ = this.serverService.servers$
      .pipe(
        map(response => {
          this.dataSubject.next(response);
          this.notifier.onDefault(response.message)
          return {dataState: DataState.LOADED_STATE, appData: {...response, data: {servers: response.data.servers.reverse()}}}
        }),
        startWith({dataState: DataState.LOADING_STATE}),
        catchError((error: string) => {
          this.notifier.onError(error)
          return of({dataState: DataState.ERROR_STATE, error: error})
        })
      )
  }

  pingServer(ipAdress: string): void {
    this.filterSubject.next(ipAdress);
    this.appState$ = this.serverService.ping$(ipAdress)
      .pipe(
        map(response => {
          const index = this.dataSubject.value.data.servers.findIndex(server => server.id === response.data.server.id)
          this.dataSubject.value.data.servers[index] = response.data.server;
          this.notifier.onDefault(response.message)
          this.filterSubject.next('');
          return {dataState: DataState.LOADED_STATE, appData: this.dataSubject.value}
        }),
        startWith({dataState: DataState.LOADED_STATE, appData: this.dataSubject.value}),
        catchError((error: string) => {
          this.filterSubject.next('');
          this.notifier.onError(error)
          return of({dataState: DataState.ERROR_STATE, error: error})
        })
      )

  }

  filterServers(status: any): void {


    this.appState$ = this.serverService.filter$(status, this.dataSubject.value)
      .pipe(
        map(response => {
          this.notifier.onDefault(response.message)
          return {dataState: DataState.LOADED_STATE, appData: response}
        }),
        startWith({dataState: DataState.LOADED_STATE, appData: this.dataSubject.value}),
        catchError((error: string) => {
          this.notifier.onError(error)
          return of({dataState: DataState.ERROR_STATE, error: error});
        })
      )

  }


  saveServer(serverForm: NgForm): void {
    this.isLoading.next(true);
    //el value del serverForm lo quie devuelve es un objeto en JSON que si es igual a la de la interface server, lo va a reconocer como tal no hace falta castearlo.
    this.appState$ = this.serverService.save$(serverForm.value)
      .pipe(
        map(response => {
          this.dataSubject.next(
            //aca, con el spreadoperator en response lo que se hace es poner toda la metadata de la response, y solamente hacer un overrate de data:)
            {...response, data: { servers : [response.data.server, ...this.dataSubject.value.data.servers]}}
          );
          document.getElementById('closeModal').click();
          serverForm.resetForm({ status: Status.SERVER_DOWN})
          this.isLoading.next(false);
          this.notifier.onDefault(response.message)
          return {dataState: DataState.LOADED_STATE, appData: this.dataSubject.value}
        }),
        startWith({dataState: DataState.LOADED_STATE, appData: this.dataSubject.value}),
        catchError((error: string) => {
          this.isLoading.next(false);
          this.notifier.onError(error)
          return of({dataState: DataState.ERROR_STATE, error: error})
        })
      )

  }


  deleteServer(server: Server): void {
    this.appState$ = this.serverService.delete$(server.id)
      .pipe(
        map(response => {
          this.dataSubject.next(
            {...response, data: {servers: this.dataSubject.value.data.servers.filter(s => s.id !== server.id)}}
          )
          this.notifier.onDefault(response.message)
          return {dataState: DataState.LOADED_STATE, appData: this.dataSubject.value}
        }),
        startWith({dataState: DataState.LOADED_STATE, appData: this.dataSubject.value}),
        catchError((error: string) => {
          this.filterSubject.next('');
          this.notifier.onError(error)
          return of({dataState: DataState.ERROR_STATE, error: error})
        })
      )

  }


  printReport(): void {
    let dataType = 'application/vnd.ms-excel.sheet.macroEnabled.12';
    let tableSelect = document.getElementById('servers');
    let tableHtml = tableSelect.outerHTML.replace(/ /g, '%20');
    let downloadLink = document.createElement('a');
    document.body.appendChild(downloadLink);
    downloadLink.href = `data: ${dataType}, ${tableHtml}`;
    downloadLink.download = "server-report.xls";
    downloadLink.click();
    document.body.removeChild(downloadLink);
    this.notifier.onDefault('report generated successfully')
  }



}
