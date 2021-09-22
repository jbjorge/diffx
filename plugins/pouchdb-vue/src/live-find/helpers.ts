import { collate } from 'pouchdb-collate';
import { filterInMemoryFields, compare, getKey, getValue, parseField } from 'pouchdb-selector-core';
import { getUserFields } from './utils';

export const memoryFilter = function(docs, requestDef) {
  const userFieldsRes = getUserFields(requestDef.selector, requestDef.sort);
  const userFields = userFieldsRes.fields;
  const rows = docs.map(function (doc) {
    return { doc: doc };
  });
  return filterInMemoryFields(rows, requestDef, userFields)
    .map(function(row) {
      return row.doc;
    });
};

// create a comparator based on the sort object
export const createFieldSorter = function(sort) {

  function getFieldValuesAsArray(doc) {
    return sort.map(function (sorting) {
      const fieldName = getKey(sorting);
      const parsedField = parseField(fieldName);
      return getFieldFromDoc(doc, parsedField);
    });
  }

  const directions = sort.map(function (sorting) {
    if (typeof sorting !== 'string' &&
      getValue(sorting) === 'desc') {
      return -1;
    }
    return 1;
  });

  return function (aRow, bRow) {
    const aFieldValues = getFieldValuesAsArray(aRow);
    const bFieldValues = getFieldValuesAsArray(bRow);
    let i = 0;
    const len = directions.length;
    for(; i<len; i++) {
      const collation = collate(aFieldValues[i], bFieldValues[i]);
      if (collation !== 0) {
        return collation * directions[i];
      }
    }
    // this is what mango seems to do
    return compare(aRow._id, bRow._id) * directions[0];
  };
};

function getFieldFromDoc(doc, parsedField) {
  let value = doc;
  let i = 0;
  const len = parsedField.length;
  for (; i < len; i++) {
    const key = parsedField[i];
    value = value[key];
    if (!value) {
      break;
    }
  }
  return value;
}