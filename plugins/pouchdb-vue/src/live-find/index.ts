import { EventEmitter } from 'events';
import { createFieldSorter, memoryFilter } from './helpers';
import { massageSelector } from 'pouchdb-selector-core';
import { massageSort, pick } from './utils';
import PouchDB from 'pouchdb-browser';

export interface RequestDef {
  aggregate: boolean;
  fields: string[];
  selector: PouchDB.Find.Selector;
  sort: any;
  skip: string | number;
  limit: string | number;
}

export interface PaginationOptions {
  skip: string | number;
  limit: string | number;
  sort: string[]
}

interface Action {
  id: string;
  rev: string;
  doc: {
    _id: string;
    _rev: string;
  }
}
interface RemoveAction extends Action { action: 'REMOVE' }
interface AddAction extends Action { action: 'ADD' }
interface UpdateAction extends Action { action: 'UPDATE' }

export interface Emitter<T = {}> extends EventEmitter {
  cancel: () => void;
  then: () => void;
  catch: () => void;
  paginate: (options: PaginationOptions) => void;
  sort: (list: any) => any;
  onUpdate: (cb: (update: AddAction | UpdateAction | RemoveAction, aggregate?: T[]) => void) => void;
	onReady: (cb: () => void) => void;
	onCancelled: (cb: () => void) => void;
	onError: (cb: (error: Error) => void) => void;
}

export function liveFind<T>(requestDef: RequestDef): Emitter {

  if(typeof this.find !== 'function') {
    throw new Error('ERROR: PouchDB Find is a requirement for LiveFind and must be loaded first.');
  }

  const db = this;
  let cancelled = false;
  const lookup = {};
  const emitter = new EventEmitter() as Emitter<T>;
  emitter.onUpdate = emitter.on.bind(emitter, 'update');
	emitter.onReady = emitter.on.bind(emitter, 'ready');
	emitter.onCancelled = emitter.on.bind(emitter, 'cancelled');
	emitter.onError = emitter.on.bind(emitter, 'error');
  let docList = [];
  const aggregate = requestDef.aggregate || false;

  // Normalize the request options
  const fields = requestDef.fields;
  let stripId = false, stripRev = false;
  if(fields) {
    // _id is a necessary field to process the docs
    if(fields.indexOf('_id') === -1) {
      fields.unshift('_id');
      stripId = true;
    }
    // We need the _rev to sort out changes but can strip it later
    if(fields.indexOf('_rev') === -1) {
      fields.push('_rev');
      stripRev = true;
    }
  }
  let selector;
  if(requestDef.selector) {
    selector = massageSelector(requestDef.selector);
  }
  let sort, sortFn;
  if(requestDef.sort) {
    sort = massageSort(requestDef.sort);
    sortFn = createFieldSorter(sort);
  }
  let skip = parseInt(requestDef.skip as string, 10) || 0;
  let limit = parseInt(requestDef.limit as string, 10) || 0;
  const findRequest = {
    selector: selector,
    // sort: sort,
    fields: fields
  };

  const ready = db.find(findRequest)
    .then(function (results) {
      results.docs.forEach(function (doc) {
        addResult(doc);
      });
      emitter.emit('ready');
    })
    .catch(function (err) {
      emitter.emit('error', err);
      cancel();
      throw err;
    });

  // We will use just one change listener for all live queries.
  // We need to keep track of how many queries are running.
  // When the last live query finishes we will cancel the listener.
  if(!db._changeListener) {
    listen();
  }
  if(!db._activeQueries) {
    db._activeQueries = 1;
  } else {
    db._activeQueries++;
  }

  db._changeListener
    .on('change', changeHandler)
    .on('error', errorHandler);

  emitter.cancel = cancel;
  // Bind the `find` query promise to our emitter object
  // so we know when the initial query is done and can catch errors
  emitter.then = ready.then.bind(ready);
  emitter.catch = ready.catch.bind(ready);

  emitter.sort = function(list) {
    if(!sort) {
      return list;
    }
    return sortList(list);
  };

  emitter.paginate = paginate;

  function changeHandler(change) {
    ready.then(function() {
      if(change.doc) {
        processChange(change.doc);
      }
    });
  }

  function errorHandler(err) {
    emitter.emit('error', err);
  }

  function cancel() {
    if(!cancelled) {
      db._activeQueries --;
      if(!db._activeQueries) {
        db._changeListener.cancel();
        delete db._changeListener;
      } else {
        db._changeListener.removeListener('change', changeHandler);
        db._changeListener.removeListener('error', errorHandler);
      }
      emitter.emit('cancelled');
      emitter.removeAllListeners();
      cancelled = true;
    }
  }

  function listen() {
    db._changeListener = db.changes({live: true, retry: true, include_docs: true, since: 'now'});
  }

  function filterDoc(doc) {
    const result = memoryFilter([doc], { selector: selector });
    if(result.length) {
      return result[0];
    }
    return null;
  }

  function pickFields(doc) {
    if (fields) {
      const output = pick(doc, fields);
      if(stripId) {
        delete output._id;
      }
      if(stripRev) {
        delete output._rev;
      }
      return output;
    }
    return doc;
  }

  // This processes the initial results of the query
  function addResult(doc) {
    lookup[doc._id] = doc._rev;
    const id = doc._id;
    const rev = doc._rev;
    if(stripId) {
      delete doc._id;
    }
    if(stripRev) {
      delete doc._rev;
    }
    return addAction(doc, id, rev);
  }

  function processChange(doc) {
    // Don't fire an update if this rev has already been processed
    if(lookup[doc._id] === doc._rev) {
      // console.warn('A change was fired twice. This shouldn\'t happen.');
      return;
    }
    const id = doc._id;
    const rev = doc._rev;
    if(doc._deleted && lookup[id]) {
      lookup[id] = null;
      return removeAction({_id: id, _rev: rev, deleted: true}, id, rev);
    }
    const outputDoc = filterDoc(doc);
    if(!outputDoc && lookup[id]) {
      lookup[id] = null;
      return removeAction({_id: id, _rev: rev}, id, rev);
    }
    if(outputDoc && !lookup[id]) {
      lookup[id] = rev;
      return addAction(pickFields(outputDoc), id, rev);
    }
    if(outputDoc && lookup[id]) {
      lookup[id] = rev;
      return updateAction(pickFields(outputDoc), id, rev);
    }
  }

  function removeAction(doc, id, rev) {
    let list;
    if(aggregate) {
      docList = docList.filter(function(item) {
        return item._id !== doc._id;
      });
      list = formatList(docList);
    }
    emitter.emit('update', { action: 'REMOVE', id, rev, doc }, list);
  }

  function addAction(doc, id, rev) {
    let list;
    if(aggregate) {
      docList = docList.concat(doc);
      list = formatList(docList);
    }
    emitter.emit('update', { action: 'ADD', id, rev, doc }, list);
  }

  function updateAction(doc, id, rev) {
    let list;
    if(aggregate) {
      docList = docList.map(function(item) {
        return item._id === doc._id ? doc : item;
      });
      list = formatList(docList);
    }
    emitter.emit('update', { action: 'UPDATE', id, rev, doc }, list);
  }

  function sortList(list) {
    return list.sort(sortFn);
  }

  // Applies sort, skip, and limit to a list
  function formatList(list) {
    if(sort) {
      list = sortList(list);
    }
    if(skip || limit) {
      if(limit) {
        list = list.slice(skip, skip + limit);
      } else {
        list = list.slice(skip);
      }
    }
    return list;
  }

  function paginate(options: PaginationOptions) {
    if(!aggregate || !options || typeof options !== 'object') {
      return;
    }
    if(options.skip != null) {
      skip = parseInt(options.skip as string, 10) || 0;
    }
    if(options.limit != null) {
      limit = parseInt(options.limit as string, 10) || 0;
    }
    if(options.sort && options.sort instanceof Array) {
      sort = massageSort(options.sort);
      sortFn = createFieldSorter(sort);
    }
    return formatList(docList);
  }
  return emitter;
}

export default { liveFind };

if (typeof window !== 'undefined' && (window as any).PouchDB) {
  (window as any).PouchDB.plugin(liveFind);
}