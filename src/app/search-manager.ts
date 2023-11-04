
export type SearchQuery={
    query_val: string;
    previous_query_id: number | undefined;
    cached_response: any | undefined;
}

export type SearchSession = {
    queries: Map<number, SearchQuery>
    current_query_id: number;
    last_query_id: number;
}

export function backwardQuery(session: SearchSession){
    const current_query = session?.queries.get(session.current_query_id)
    session.current_query_id = 
        current_query && current_query.previous_query_id? 
            current_query.previous_query_id : session.current_query_id   
    
}

export function neighborQueries(session: SearchSession, id: number): Array<number>{
    var previousQueryId = session.queries.get(id)?.previous_query_id
    if (! previousQueryId) return []

    var neighborQueries: Array<number> = []
    for (const [key, value] of session.queries) { 
        if (value.previous_query_id == previousQueryId){
            neighborQueries.push(key)
        }
    }
    return neighborQueries
}

export function addQueryToSession(query: string, session: SearchSession): number {
    const query_id: number = session.last_query_id + 1
    session.last_query_id = query_id

    session.queries.set(query_id, 
        {query_val: query, 
            previous_query_id: session.current_query_id, cached_response: undefined})
    
    session.current_query_id = query_id
    return query_id
}


export function exportSession(session: SearchSession): string{
    console.log(session)

    var queries_info=[]
    for (const [key, value] of session.queries) { 
       queries_info.push({'id': key, 'previous': value.previous_query_id, 'value': value.query_val, 'cached_response': value.cached_response})
    }
    var session_info = {
        'current_query_id': session.current_query_id, 
        'last_query_id': session.last_query_id,
        'queries': queries_info
    }
    return JSON.stringify(session_info)
}

export function importSession(session: SearchSession, import_info: any){

    session.current_query_id = import_info['current_query_id']
    session.last_query_id = import_info['last_query_id']
    
    for(var i=0;i< import_info['queries'].length;i++){
        let info = import_info['queries'][i]
        session.queries.set(info['id'], {previous_query_id: info['previous'], query_val: info['value'], cached_response: undefined})
    }
}

export function cacheResponse(session: SearchSession, queryId: number, response: any){
    var query: SearchQuery | undefined = session.queries.get(queryId)
    if (!query) return
    query.cached_response = response
}

export namespace MainSession{
    export var instance: SearchSession = { queries: new Map<number, SearchQuery>(), last_query_id: 0, current_query_id: 0}
}
