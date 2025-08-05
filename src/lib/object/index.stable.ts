type PatternSegment =
  | { type: 'fixed'; value: string }
  | { type: 'wildcard' }
  | { type: 'doubleWildcard' }
  | { type: 'uniqs'; value: string[] }
  | { type: 'range'; from: number; to: number }
  | {
      type: 'stringMatch';
      conditions: {
        startWith?: string;
        endWith?: string;
        includes?: string;
      };
    }
  | { type: 'rules'; ruleNames: string[] };

type TraverseOptions = {
  modeOfBehavior: 'modify_entry_object' | 'return_new_object';
  rules: { name: string; rule: (key: string | number) => boolean }[];
};

type Callback = (args: {
  key: string | number;
  value: any;
  objectPath: (string | number)[];
  parent: any;
  setValue: <T>(v: T) => T;
  setKey: <T extends string | number>(v: T) => T;
}) => void;

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(deepClone) as unknown as T;
  }

  const cloned: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned as T;
}

function getTraversalKeys(obj: any): string[] {
  if (obj === null || typeof obj !== 'object') {
    return [];
  }
  if (Array.isArray(obj)) {
    return Array.from({ length: obj.length }, (_, i) => i.toString());
  }
  return Object.keys(obj);
}

function parsePattern(pattern: string): PatternSegment[] {
  const segments: PatternSegment[] = [];
  let current = '';
  let inCondition = false;
  let parenCount = 0;
  let conditionContent = '';

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];

    if (char === '(' && !inCondition) {
      if (current) {
        segments.push(parseNonConditionSegment(current));
        current = '';
      }
      inCondition = true;
      parenCount = 1;
      continue;
    }

    if (inCondition) {
      if (char === '(') {
        parenCount++;
        conditionContent += char;
      } else if (char === ')') {
        parenCount--;
        if (parenCount === 0) {
          segments.push(parseCondition(conditionContent));
          conditionContent = '';
          inCondition = false;
          continue;
        } else {
          conditionContent += char;
        }
      } else {
        conditionContent += char;
      }
    } else {
      if (char === '.') {
        if (current) {
          segments.push(parseNonConditionSegment(current));
          current = '';
        }
      } else {
        current += char;
      }
    }
  }

  if (inCondition) {
    throw new Error(`Unterminated condition in pattern: ${pattern}`);
  }

  if (current) {
    segments.push(parseNonConditionSegment(current));
  }

  return segments;
}

function parseNonConditionSegment(segment: string): PatternSegment {
  if (segment === '*') {
    return { type: 'wildcard' };
  }
  if (segment === '**') {
    return { type: 'doubleWildcard' };
  }
  return { type: 'fixed', value: segment };
}

function parseCondition(condition: string): PatternSegment {
  try {
    const conditionObj = JSON.parse(condition);

    if (Array.isArray(conditionObj)) {
      return { type: 'uniqs', value: conditionObj };
    }

    if (typeof conditionObj === 'object' && conditionObj !== null) {
      if ('uniqs' in conditionObj && Array.isArray(conditionObj.uniqs)) {
        return { type: 'uniqs', value: conditionObj.uniqs };
      }
      if ('from' in conditionObj && 'to' in conditionObj) {
        return {
          type: 'range',
          from: Number(conditionObj.from),
          to: Number(conditionObj.to),
        };
      }

      // Handle string matching conditions
      const stringConditions: {
        startWith?: string;
        endWith?: string;
        includes?: string;
      } = {};

      if ('startWith' in conditionObj && typeof conditionObj.startWith === 'string') {
        stringConditions.startWith = conditionObj.startWith;
      }
      if ('endWith' in conditionObj && typeof conditionObj.endWith === 'string') {
        stringConditions.endWith = conditionObj.endWith;
      }
      if ('includes' in conditionObj && typeof conditionObj.includes === 'string') {
        stringConditions.includes = conditionObj.includes;
      }

      // Only create stringMatch if at least one condition exists
      if (Object.keys(stringConditions).length > 0) {
        return {
          type: 'stringMatch',
          conditions: stringConditions,
        };
      }

      // Handle rules condition
      if ('rules' in conditionObj && Array.isArray(conditionObj.rules)) {
        return {
          type: 'rules',
          ruleNames: conditionObj.rules,
        };
      }
    }

    throw new Error(`Invalid condition format: ${condition}`);
  } catch (e) {
    throw new Error(
      `Failed to parse condition: ${condition}. ${e instanceof Error ? e.message : ''}`
    );
  }
}

function matchesStringConditions(
  key: string,
  conditions: {
    startWith?: string;
    endWith?: string;
    includes?: string;
  }
): boolean {
  if (conditions.startWith !== undefined && !key.startsWith(conditions.startWith)) {
    return false;
  }
  if (conditions.endWith !== undefined && !key.endsWith(conditions.endWith)) {
    return false;
  }
  if (conditions.includes !== undefined && !key.includes(conditions.includes)) {
    return false;
  }
  return true;
}

function traverse(
  obj: any,
  segments: PatternSegment[],
  index: number,
  callback: Callback,
  path: (string | number)[],
  parent: any,
  key: string | number | null,
  options: TraverseOptions
): void {
  if (index === segments.length) {
    if (key !== null) {
      const setValue = <T>(newValue: T): T => {
        if (parent !== null && key !== null) {
          parent[key] = newValue;
        }
        return newValue;
      };

      const setKey = <T extends string | number>(newKey: T): T => {
        if (parent !== null && key !== null) {
          if (Array.isArray(parent)) {
            throw new Error('setKey is not supported for arrays');
          }
          parent[newKey] = parent[key];
          delete parent[key];
        }
        return newKey;
      };

      callback({
        key,
        value: obj,
        objectPath: path,
        parent,
        setValue,
        setKey,
      });
    }
    return;
  }

  if (obj === null || typeof obj !== 'object') return;

  const segment = segments[index];

  // Handle double wildcard (deep traversal)
  if (segment.type === 'doubleWildcard') {
    // Match at current level without advancing pattern
    traverse(obj, segments, index + 1, callback, path, parent, key, options);

    // Recursively traverse all properties
    const keys = getTraversalKeys(obj);
    for (const nextKey of keys) {
      const nextObj = obj[nextKey];
      if (nextObj !== null && typeof nextObj === 'object') {
        const nextPath = [...path, nextKey];
        traverse(
          nextObj,
          segments,
          index, // Keep same index for doubleWildcard
          callback,
          nextPath,
          obj,
          nextKey,
          options
        );
      }
    }
    return;
  }

  const keys = getTraversalKeys(obj);
  let nextKeys: string[] = [];

  if (segment.type === 'fixed') {
    if (keys.includes(segment.value)) {
      nextKeys = [segment.value];
    }
  } else if (segment.type === 'wildcard') {
    nextKeys = keys;
  } else if (segment.type === 'uniqs') {
    nextKeys = segment.value.filter((k) => keys.includes(k));
  } else if (segment.type === 'range') {
    nextKeys = keys.filter((key) => {
      const n = Number(key);
      return !isNaN(n) && n >= segment.from && n <= segment.to;
    });
  } else if (segment.type === 'stringMatch') {
    nextKeys = keys.filter((key) => matchesStringConditions(key, segment.conditions));
  } else if (segment.type === 'rules') {
    nextKeys = keys.filter((key) => {
      return segment.ruleNames.some((ruleName) => {
        const rule = options.rules.find((r) => r.name === ruleName);
        if (!rule) return false;
        return rule.rule(key);
      });
    });
  }

  for (const nextKey of nextKeys) {
    const nextObj = obj[nextKey];
    const nextPath = [...path, nextKey];

    traverse(nextObj, segments, index + 1, callback, nextPath, obj, nextKey, options);
  }
}

export function customEach<T>(
  obj: T,
  pattern: string,
  options: TraverseOptions,
  callback: Callback
): T | undefined {
  const segments = parsePattern(pattern);
  const workingObj = options.modeOfBehavior === 'return_new_object' ? deepClone(obj) : obj;

  traverse(workingObj, segments, 0, callback, [], null, null, options);

  return options.modeOfBehavior === 'return_new_object' ? workingObj : undefined;
}

export default { customEach };
