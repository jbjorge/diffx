# @diffx/plugin-pouchdb

## API

### setDiffxPouchDbOptions

```javascript
import { setDiffxPouchdbOptions } from '@diffx/plugin-pouchdb-vue';

setDiffxPouchdbOptions({
    pouchInstance: instance,
    storeDiffs: boolean // enables undo/redo
})
```

### createPouchDbState

```javascript
import { createPouchDbState } from '@diffx/plugin-pouchdb-vue';

const doc = createPouchDbState('db-name', 'id');
// creates doc if not exists, after that, normal diffx api
doc._undo();
doc._redo();

const docs = createPouchDbState('db-name', query);
// returns array of docs, normal diffx api after that

// undo the doc in the array with the latest change
docs._undo();
docs._redo();
```

### undoDoc/redoPouchDoc

```javascript
import { undoDoc, redoDoc } from '@diffx/plugin-pouchdb-vue';

await undoDoc(doc);
await redoDoc(doc);
```

### onPouchDbError

```javascript
import { onPouchDbError } from '@diffx/plugin-pouchdb-vue';

onPouchDbError((error, doc, pouchDbInstance) => {
    if (error.status === '409') {
        // do something
    }
})
```
