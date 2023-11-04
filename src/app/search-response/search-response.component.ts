import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { Position } from 'vis-network';


export type SearchResponseInfo = {
  url: string;
  snippet: string;
  name: string;
}
@Component({
  selector: 'app-search-response',
  templateUrl: './search-response.component.html',
  styleUrls: ['./search-response.component.css']
})
export class SearchResponseComponent {
  //Info about pages from search response
  @Input() pages: Array<SearchResponseInfo> = []
  @ViewChild('response') searchResponse!: ElementRef;

  moveResponse(position: Position){
    this.searchResponse.nativeElement.style.left = position.x - 100 + 'px'
    this.searchResponse.nativeElement.style.top = position.y - 150 + 'px'
  }

  setActiveSearchResponse(active: boolean){
    if (active){
      this.searchResponse.nativeElement.style.display = 'block'
    }
    else{
      this.searchResponse.nativeElement.style.display = 'none'
    }
  }

  isSearchResponseActive(): boolean{
    return this.searchResponse.nativeElement.style.display != 'none'
  }
}
