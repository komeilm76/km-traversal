import { IJsonPatternCondition } from './customEach';

export const StandardConditions: IJsonPatternCondition[] = [
  // String operations
  {
    name: 'startsWith',
    action: (_, __, target, conditionValue) =>
      typeof target === 'string' && target.startsWith(conditionValue),
  },
  {
    name: 'endsWith',
    action: (_, __, target, conditionValue) =>
      typeof target === 'string' && target.endsWith(conditionValue),
  },
  {
    name: 'includes',
    action: (_, __, target, conditionValue) =>
      typeof target === 'string' && target.includes(conditionValue),
  },
  {
    name: 'matches',
    action: (_, __, target, conditionValue) =>
      typeof target === 'string' && new RegExp(conditionValue).test(target),
  },

  // Numeric comparisons
  {
    name: 'greaterThan',
    action: (_, __, target, conditionValue) =>
      typeof target === 'number' && target > conditionValue,
  },
  {
    name: 'lessThan',
    action: (_, __, target, conditionValue) =>
      typeof target === 'number' && target < conditionValue,
  },
  {
    name: 'between',
    action: (_, __, target, conditionValue) =>
      typeof target === 'number' && target >= conditionValue[0] && target <= conditionValue[1],
  },

  // Equality checks
  {
    name: 'equalWith',
    action: (_, __, target, conditionValue) => target === conditionValue,
  },
  {
    name: 'notEqual',
    action: (_, __, target, conditionValue) => target !== conditionValue,
  },

  // Type checking
  {
    name: 'isString',
    action: (_, __, target) => typeof target === 'string',
  },
  {
    name: 'isNumber',
    action: (_, __, target) => typeof target === 'number',
  },
  {
    name: 'isArray',
    action: (_, __, target) => Array.isArray(target),
  },
  {
    name: 'isObject',
    action: (_, __, target) =>
      typeof target === 'object' && !Array.isArray(target) && target !== null,
  },

  // Array operations
  {
    name: 'arrayIncludes',
    action: (_, __, target, conditionValue) =>
      Array.isArray(target) && target.includes(conditionValue),
  },
  {
    name: 'length',
    action: (_, __, target, conditionValue) =>
      Array.isArray(target) && target.length === conditionValue,
  },
];

export default {
  StandardConditions,
};
