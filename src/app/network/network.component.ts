import { Component, AfterViewInit, ElementRef, ViewChild, Input, HostListener, AfterContentChecked } from '@angular/core';
import { Network, DataSet, Data, Node, Edge, Position, IdType} from 'vis-network/standalone';
import { SearchQuery, SearchSession, MainSession, addQueryToSession, exportSession, importSession, backwardQuery, neighborQueries, cacheResponse } from '../search-manager';
import { SearchResponseComponent, SearchResponseInfo } from '../search-response/search-response.component';
import axios from 'axios';

const servers = ['http://localhost:6001']

@Component({
  selector: 'net-graph',
  template: `
              <button (click)="onExportClick()">export</button>
              <input type="file" id="file-input" name="import" (change)="importSession($event)"/> 
              <input #search (keyup.enter)="onSearchEnter(search.value)" class="search_class" (keyup.space)="onSearchinput(search.value)" autofocus/>
              <br>
              <input #suggestserver (keyup.enter)="onSuggestServerChange(suggestserver.value)" value="http://localhost:6001"/>
              <input #searchserver (keyup.enter)="onSearchServerChange(searchserver.value)" value="http://localhost:6001"/>
              <br>
              <select #providers></select>
              <select #suggesters multiple></select>

              <div #network></div>
              <app-search-response #response [pages]="pages"/>
              `,
  styleUrls: ['./network.component.css']
})

export class NetworkComponent implements AfterViewInit {
  //References to html elements
  @ViewChild('network') netRoot!: ElementRef;
  @ViewChild('search') searchField!: ElementRef;

  @ViewChild('suggestserver') suggesterServer!: ElementRef;
  @ViewChild('searchserver') searchServer!: ElementRef;

  @ViewChild('suggesters') suggestersList!: ElementRef;
  @ViewChild('providers') providersList!: ElementRef;

  //Search response component reference
  @ViewChild(SearchResponseComponent) searchResponse!: SearchResponseComponent;

  private networkInstance!: Network;
  //Network elements
  private nodes: DataSet<Node> = new DataSet<Node>();
  private edges: DataSet<Edge> = new DataSet<Edge>();

  private temporaryNodes: Map<IdType, Array<IdType>> = new Map<IdType, Array<IdType>>();
  //Array of infos about links from search responses to communicate with component
  pages: Array<SearchResponseInfo> = []
  
  //Dynamicly created link object for exporting
  private setting = {
    element: {
      dynamicDownload: null as unknown as HTMLElement
    }
  }
  private searchProviders: Array<string> = []
  private suggesters: Array<string> = []

  private currentSearchServer: string = ''
  private currentSuggestServer: string = ''

  updateSearchServerList(){
    axios.get(this.currentSuggestServer +"/search/list",).
    then(response => {
      console.log(response)
      this.searchProviders = response.data
      this.updateProvidersListView()
    })

    
  }
  async onSearchServerChange(value: string){
    this.currentSearchServer = value
    this.updateSearchServerList()
  }

  updateSuggetServerList(){
    axios.get(this.currentSuggestServer + "/suggest/list").
    then(response => {
      console.log(response)
      this.suggesters = response.data
      this.updateSuggestersListView()
    })

    
  }

  onSuggestServerChange(value: string){
    this.currentSuggestServer = value
    this.updateSuggetServerList();
  }

  async onSearchEnter(value: string){
    this.networkInstance.enableEditMode()
    this.addNode(value)
    this.setActiveSearchField(false)
    this.generateSearchResponse(value, false)
    
    
  }

  generateSearchResponse(query: string, createNode: boolean){
    this.searchResponse.setActiveSearchResponse(false)

    for(var i = 0; i < this.providersList.nativeElement.options.length; i++){
        var providerOption = this.providersList.nativeElement.options[i];
        if (!providerOption.selected) continue

        this.searchProviders.every(searchProvider => {
          if (searchProvider != providerOption.text){
            return true
          }
          axios.get(this.currentSearchServer + "/search", {params: {provider: searchProvider, q: query}}).then(x=>{
            console.log(x)
            this.pages =[]
            x.data.forEach((page: any) => {
              this.pages.push({url: page.url, name: page.name, snippet: page.snippet})
            });
            
            this.searchResponse.setActiveSearchResponse(true)
            this.moveSearchResponseToActiveNode()
      
            cacheResponse(MainSession.instance, MainSession.instance.current_query_id, x.data)
          })  
            
          return false;
        })
        break
    }
  }


  importSession(e:any) {
    let fileReader = new FileReader();
    fileReader.onload = (e) => {
      var importSessionInfo = JSON.parse(fileReader.result as string)
      importSession(MainSession.instance, importSessionInfo)
      this.loadCompleteSession(MainSession.instance)
    }
    fileReader.readAsText(e.target.files[0]);
  }
  @HostListener('window:keyup', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if(this.searchField.nativeElement.style.display != 'none') return
    switch(event.key.toLowerCase()){
      case ' ':
      case 'w':
      {
        this.moveSearchFieldToActiveNode()
        this.setActiveSearchField(true)
        break
      }
      case 'a':
      {
        let queries = neighborQueries(MainSession.instance, MainSession.instance.current_query_id)
        //TODO: 
        
        break
      }
      case 'd':
      {
        break
      }

      case 's':
      case 'control':{
        backwardQuery(MainSession.instance)
        this.updateFocus(MainSession.instance)
        break
      }
      case 'h':
        this.searchResponse.setActiveSearchResponse(!this.searchResponse.isSearchResponseActive())
        break;
    }

  }

  updateProvidersListView(){
    if (this.providersList){
      this.searchProviders.forEach(provider => {
        var option = new Option();
        option.text = provider;
        this.providersList.nativeElement.options.add(option)
      })
    }
  }

  updateSuggestersListView(){
    if (this.suggestersList){
      this.suggesters.forEach(suggester => {
        var option = new Option();
        option.text = suggester;
        this.suggestersList.nativeElement.options.add(option)
      })
    }
  }

  updateServersListView(){
    if (this.suggesterServer){
      servers.forEach(server => {
        var option = new Option();
        option.text = server;
        this.suggesterServer.nativeElement.options.add(option)
      })
    }
    if (this.searchServer){
      servers.forEach(server => {
        var option = new Option();
        option.text = server;
        this.searchServer.nativeElement.options.add(option)
      })
    }
  }


  async ngAfterViewInit() {
    if (servers.length > 0){
      this.currentSearchServer = servers[0]
      this.currentSuggestServer = servers[0]
    }
    this.updateSuggetServerList()
    this.updateSearchServerList()

    //this.updateServersListView()
    this.updateSuggestersListView()
    this.updateProvidersListView()

    const container = this.netRoot.nativeElement;
    var nodes = this.nodes
    var edges = this.edges
    let data: Data = { nodes, edges };
    
    this.networkInstance = new Network(container, data, {});

    var options = { 
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        stabilization: {
          enabled: true,
          iterations: 5000
        }
      },
      nodes:{
        shape:'box'
      }
    };

    this.networkInstance.setOptions(options);
    this.networkInstance.on('dragStart', (params) =>{
      if (this.nodes.length == 0) return;
        this.setActiveSearchField(false);
    })
    this.networkInstance.on('dragEnd', (params) =>{
      this.moveSearchResponseToActiveNode()
    })
    this.networkInstance.on('zoom', (params) =>{
      this.moveSearchResponseToActiveNode()
    })
    this.networkInstance.on('selectNode', (params) =>{      
      var selected: number = params['nodes'][0]
      this.searchField.nativeElement.value = this.nodes.get(selected)?.label

      for (const [key, value] of this.temporaryNodes) {
        var found: boolean = false
        for(const node_id of value){
          
          if (node_id == selected){
            found = true
            break
          }
        } 
        if(found){
          var label: string |undefined = this.nodes.get(selected)?.label
          for(const node_id of value){
            this.nodes.remove(node_id)
          }
          this.temporaryNodes.delete(key)
          if(label)this.addNode(label)
          return 
        }
      }


      MainSession.instance.current_query_id = selected 
      this.moveSearchResponseToActiveNode()
      let pagesList = MainSession.instance.queries.get(MainSession.instance.current_query_id)?.cached_response?.webPages?.value
      if (!pagesList){
        //search
        var node= this.nodes.get(selected)
        if(node) this.generateSearchResponse(node.label ? node.label : '', false)
        return
      } 
      console.log('fdfdfdfdfd')
      this.pages =[]
      for(let i = 0; i < pagesList.length; i++) this.pages.push({url: pagesList[i].url, name: pagesList[i].name, snippet: pagesList[i].snippet})
    })
    this.networkInstance.on('click', (params) =>{
      if (this.nodes.length == 0){
        const clickPosition = params['pointer']['DOM']
        this.setActiveSearchField(true);
        this.setSearchFieldPosition({x: clickPosition['x'], y: clickPosition['y']})
        return;
      }
      if((params['nodes'] as Array<number>).includes(MainSession.instance.current_query_id)){
        this.setActiveSearchField(true);
        let id = MainSession.instance.current_query_id;
        this.moveSearchFieldToActiveNode()
        this.moveSearchResponseToActiveNode()
      }
      else{
        this.setActiveSearchField(false);
      }
    })

  }

  pendingRequests: boolean = false
  onSearchinput(value: string){
    if (this.pendingRequests) return
    this.clearTemporaryNodes()
    
    
    for(var i = 0; i < this.suggestersList.nativeElement.options.length; i++){
      var selectedName = this.suggestersList.nativeElement.options[i];
      console.log(selectedName)
      if (!selectedName.selected) continue
      
      this.suggesters.forEach(suggester =>{
        if (suggester == selectedName.text){
          axios.get(this.currentSuggestServer + "/suggest", {params: {suggester: suggester, q: value}})
          .then(data=>{
            console.log(data.data)
            if (!data.data) return
            for(var i = 0; i < data.data.length; i++){
              this.addTemporaryNode(data.data[i].text, MainSession.instance.current_query_id)
            }
          })
        }
      })
    }
  }
  clearTemporaryNodes(){
    this.temporaryNodes.forEach((value, key) => {
      for(const node_id of value){
        this.nodes.remove(node_id)
      }
    });
    this.temporaryNodes.clear()
  }

  addTemporaryNode(query: string, parent_id: number){
    if(!this.temporaryNodes.has(parent_id)) this.temporaryNodes.set(parent_id, [])
    const id = this.nodes.add({label: query, color:'green'})
    this.edges.add({from: parent_id, to: id[0] as unknown as number })
    this.temporaryNodes.get(parent_id)?.push(id[0] as unknown as number)
  }

  setSearchFieldPosition(position: Position){
    this.searchField.nativeElement.style.top = position.y + 30 + 'px'
    this.searchField.nativeElement.style.left = position.x - 150 + 'px'
  }

  moveSearchFieldToActiveNode(){
    this.setSearchFieldPosition(this.getActiveNodePosition())
  }
  getActiveNodePosition(): Position{
    let id = MainSession.instance.current_query_id;
    const nodePostion: Position = this.networkInstance.getPosition(id)
    
    return this.networkInstance.canvasToDOM(nodePostion)
  }
  moveSearchResponseToActiveNode(){
    if(this.nodes.length == 0) return;
    this.searchResponse.moveResponse(this.getActiveNodePosition())
  }
  setActiveSearchField(active: boolean){
    if (active){
      this.searchField.nativeElement.style.display = 'block'
      this.searchField.nativeElement.focus()
    }
    else{
      this.searchField.nativeElement.style.display = 'none'
    }
  }
  updateFocus(session: SearchSession){
    this.networkInstance?.focus(session?.current_query_id)
    this.networkInstance.selectNodes([session?.current_query_id])
  }

  addNode(label: string){
    let past_node_id = MainSession.instance.current_query_id
    let node_id: number = addQueryToSession(label, MainSession.instance)
    this.nodes.add({id: node_id, label: label})
    this.edges.add({from: past_node_id, to:node_id, arrows: "to"})
    this.updateFocus(MainSession.instance)
  }

  addNodeWithImage(label: string, image: string){
    let past_node_id = MainSession.instance.current_query_id
    let node_id: number = addQueryToSession(label, MainSession.instance)
    this.nodes.add({id: node_id, label: label,
      image: image,
    shape: "image",})
    this.edges.add({from: past_node_id, to:node_id, arrows: "to"})
    this.updateFocus(MainSession.instance)
  }

  loadCompleteSession(session: SearchSession){
    for (const [key, value] of session.queries) { 
      this.nodes.add({id:key, label: value.query_val})
    }
    
    this.nodes.forEach((item: Node)=>{
      let nodeToId: number | undefined = item.id as number
      if (!session.queries.has(nodeToId)) {
        return
      }
      let nodeFromId: number | undefined = session.queries.get(nodeToId)?.previous_query_id
      this.edges.add({from: nodeFromId, to: nodeToId, arrows: 'to'})

    })

    this.updateFocus(session)
  }


  onExportClick(){
    if (!this.setting.element.dynamicDownload) {
      this.setting.element.dynamicDownload = document.createElement('a');
    }
    const element = this.setting.element.dynamicDownload;
    const fileType = 'text/json';
    element.setAttribute('href', `data:${fileType};charset=utf-8,${encodeURIComponent(exportSession(MainSession.instance))}`);
    element.setAttribute('download', "Session.json");

    var event = new MouseEvent("click");
    element.dispatchEvent(event);
  }
}