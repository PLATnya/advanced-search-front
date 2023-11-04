import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { NetworkComponent } from './network/network.component';
import { SearchResponseComponent } from './search-response/search-response.component';

@NgModule({
  declarations: [
    AppComponent,
    NetworkComponent,
    SearchResponseComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
