import { getKey, getFieldFromDoc, setFieldInDoc, parseField } from 'pouchdb-selector-core';

// determine the maximum number of fields
// we're going to need to query, e.g. if the user
// has selection ['a'] and sorting ['a', 'b'], then we
// need to use the longer of the two: ['a', 'b']
export const getUserFields = function (selector, sort) {
  const selectorFields = Object.keys(selector);
  const sortFields = sort ? sort.map(getKey) : [];
  let userFields;
  if (selectorFields.length >= sortFields.length) {
    userFields = selectorFields;
  } else {
    userFields = sortFields;
  }

  if (sortFields.length === 0) {
    return {
      fields: userFields
    };
  }

  // sort according to the user's preferred sorting
  userFields = userFields.sort(function (left, right) {
    let leftIdx = sortFields.indexOf(left);
    if (leftIdx === -1) {
      leftIdx = Number.MAX_VALUE;
    }
    let rightIdx = sortFields.indexOf(right);
    if (rightIdx === -1) {
      rightIdx = Number.MAX_VALUE;
    }
    return leftIdx < rightIdx ? -1 : leftIdx > rightIdx ? 1 : 0;
  });

  return {
    fields: userFields,
    sortOrder: sort.map(getKey)
  };
};

// normalize the "sort" value
export const massageSort = function (sort) {
  if (!Array.isArray(sort)) {
    throw new Error('invalid sort json - should be an array');
  }
  return sort.map(function (sorting) {
    if (typeof sorting === 'string') {
      const obj = {};
      obj[sorting] = 'asc';
      return obj;
    } else {
      return sorting;
    }
  });
};

// Selects a list of fields defined in dot notation from one doc
// and copies them to a new doc. Like underscore _.pick but supports nesting.
export const pick = function (obj, arr): any {
  const res = {};
  let i = 0;
  const len = arr.length;
  for (; i < len; i++) {
    const parsedField = parseField(arr[i]);
    const value = getFieldFromDoc(obj, parsedField);
    if (typeof value !== 'undefined') {
      setFieldInDoc(res, parsedField, value);
    }
  }
  return res;
};
