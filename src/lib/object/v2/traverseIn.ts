import { jsonrepair } from 'jsonrepair';

/**
 * Represents any nested data structure that can be traversed
 * - Objects: { key: value, nested: { ... } }
 * - Arrays: [item1, item2, ...]
 * - Mixed: { items: [ { id: 1 }, { id: 2 } ] }
 */
export type IEntryData = object | any[];

/**
 * Defines a single step in the traversal pattern
 * - Determines how to navigate through data at each level
 * - Used to build complex traversal paths
 */
export type PatternStep =
  | { type: 'property'; name: string } // Direct property access
  | { type: 'single-star' } // Iterate all immediate children
  | { type: 'double-star'; depth?: number } // Recursive descent (optional depth)
  | { type: 'single-key'; key: string } // Access specific key
  | { type: 'multi-key'; keys: string[] } // Access multiple specific keys
  | { type: 'object-cond'; conditions: Record<string, any> } // AND conditions
  | { type: 'array-cond'; conditions: Record<string, any>[] }; // OR of AND conditions

/**
 * Defines a custom condition function for filtering during traversal
 * @property name - Unique identifier for the condition (e.g., 'startsWith')
 * @property action - Function that evaluates the condition
 */
export interface IJsonPatternCondition<NAME extends string = string> {
  name: NAME;
  action: (key: string | number, value: any, target: any, conditionValue: any) => boolean;
}

type IPatternShortcust = {
  singleStar: boolean; // with enable this property , this Syntax Example supported : '*' , usage example : users.*.name
  doubleStar: boolean; // with enable this property , this Syntax Example supported : '**' , usage example : **.$refs
  braketScope: boolean; // ignore description abot this
};

/**
 * Configuration options for the customEach function
 * @property injectedConditions - Array of custom condition functions
 */
type ICustomEachOptions<
  CONDITIONS extends CONDITION[],
  CONDITION extends IJsonPatternCondition<NAME>,
  NAME extends string
> = {
  injectedConditions: [...CONDITIONS];
  shortcuts?: IPatternShortcust;
};

/**
 * Parameters passed to traversal callbacks
 * @property key - Current key/index in parent
 * @property value - Current value
 * @property objectPath - Full path to current node
 * @property parent - Reference to parent object/array
 * @property setKey - Function to rename current key (object properties only)
 * @property setValue - Function to modify current value
 */
export interface CallbackParams {
  key: string | number;
  value: any;
  objectPath: (string | number)[];
  parent: any;
  setKey: (newKey: string) => void;
  setValue: (newValue: any) => void;
  remove: () => void;
  removeNears: () => void;
}

/**
 * Callback function type for traversal operations
 */
export type Callback = (params: CallbackParams) => void;

/**
 * Represents a node during traversal
 * @property node - Current data node
 * @property parent - Parent of current node
 * @property key - Key/index in parent
 * @property path - Accumulated path to node
 */
export interface TraversalNode {
  node: any;
  parent: any;
  key: string | number | null;
  path: (string | number)[];
}

/**
 * Specialized node for double-star traversal with depth tracking
 */
export interface DoubleStarNode extends TraversalNode {
  depth: number;
}

/**
 * Parses pattern string into executable traversal steps
 * @param pattern - Traversal pattern string
 * @returns Array of PatternStep objects
 *
 * Pattern Syntax:
 * - Properties: 'user'
 * - Single-star: '(*)' , shortcut: '*'
 * - Double-star: '(**)' , '(*2*)' , shortcut: '*2*' , '**'
 * - Single-key: '("id")' , (id)
 * - Multi-key: '("id","name")' , (id,name)
 * - Object condition: '({"value.startsWith"."a"})' , '({value.startsWith:"a"})'
 * - Array condition: '([{"value.>":5},{"value.<":10}])' , ([{value.>:5},{value.<:10}])
 *
 * Example: 'users.(*).contacts.(**).email'
 * Example: `users.(0,"3",'5').contacts.(**).email`
 * Example: 'users.(*).(contacts).(**).email'
 * Example: 'users.(*).('contacts',info,"meta").(**).email'
 * Example: 'users.(*).("contacts").(**).(email,password,phone)'
 * Example: 'users.(*).("contacts").(**).({key.equalWith:'phone',value:startsWith:"+98"})'
 * Example: 'users.(*).("contacts").(**).([{key.equalWith:'phone',value:startsWith:"+98"},{key.equalWith:'phone',value:startsWith:"+92"}])'
 */
function parsePattern(pattern: string, options: { shortcuts: IPatternShortcust }): PatternStep[] {
  const steps: PatternStep[] = [];
  let current = '';
  let depth = 0;
  let inQuotes = false;

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];

    if (char === '"' && (i === 0 || pattern[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
    }

    if (!inQuotes) {
      if (char === '(') depth++;
      if (char === ')') depth--;

      if (char === '.' && depth === 0) {
        if (current) steps.push(createStep(current, options));
        current = '';
        continue;
      }
    }

    current += char;
  }

  if (current) steps.push(createStep(current, options));
  return steps;
}

const isInStringScope = (value: string) => {
  const isInSingleQute = value.startsWith('"') && value.endsWith('"');
  const isInDoubleQute = value.startsWith("'") && value.endsWith("'");
  return { isInDoubleQute, isInSingleQute };
};

/**
 * Creates a PatternStep from tokenized pattern segment
 * @param token - Segment of pattern string
 * @returns Parsed PatternStep
 */

function createStep(token: string, options: { shortcuts: IPatternShortcust }): PatternStep {
  if (token.startsWith('(') && token.endsWith(')')) {
    const content = token.substring(1, token.length - 1).trim();

    if (content === '*') return { type: 'single-star' };
    const regxOfNumberBeforeDubble = /^(\d*)\*\*$/;
    const regxOfNumberBetweenDubble = /^\*(\d*)\*$/;
    const doubleStarMatch = content.match(regxOfNumberBetweenDubble);
    if (doubleStarMatch) {
      return doubleStarMatch[1]
        ? { type: 'double-star', depth: parseInt(doubleStarMatch[1]) }
        : { type: 'double-star' };
    }

    if (content.startsWith('{')) {
      try {
        return { type: 'object-cond', conditions: JSON.parse(jsonrepair(content)) };
      } catch {
        throw new Error(`Invalid object condition: ${content}`);
      }
    }

    if (content.startsWith('[')) {
      try {
        return { type: 'array-cond', conditions: JSON.parse(jsonrepair(content)) };
      } catch {
        throw new Error(`Invalid array condition: ${content}`);
      }
    }

    if (!content.includes(',') && !content.startsWith('[') && !content.startsWith('{')) {
      let stringScope = isInStringScope(content);
      let repairedContent = content;
      if (stringScope.isInDoubleQute) {
        repairedContent = content;
      } else if (stringScope.isInSingleQute) {
        repairedContent = content.replace("'", '"');
      } else if (stringScope.isInDoubleQute == false && stringScope.isInSingleQute == false) {
        repairedContent = `"${content}"`;
      } else {
        repairedContent = content.replace("'", '"');
      }
      return { type: 'single-key', key: repairedContent.slice(1, -1) };
    }

    if (
      content.includes(',') &&
      !content.startsWith('[') &&
      !content.startsWith('{')
      // &&
      // content.split(',').every((part) => part.trim().startsWith('"') && part.trim().endsWith('"'))
    ) {
      const repairedContent = content
        .split(',')
        .map((part) => {
          const trimedPart = part.trim();
          const stringScope = isInStringScope(trimedPart);
          if (stringScope.isInDoubleQute) {
            return part;
          } else if (stringScope.isInSingleQute) {
            return part.replace("'", '"');
          } else if (stringScope.isInDoubleQute == false && stringScope.isInSingleQute == false) {
            return `"${part}"`;
          } else {
            return part.replace("'", '"');
          }
        })
        .join(',');

      const keys = repairedContent.split(',').map((s) => s.trim().slice(1, -1));
      return { type: 'multi-key', keys };
    }

    throw new Error(`Unrecognized pattern token: ${token}`);
  }
  if (options.shortcuts.singleStar == true && token.trim() === '*') {
    const repairedToken = `(${token})`;
    return createStep(repairedToken, options);
  }
  if (options.shortcuts.doubleStar == true && token.trim() === '**') {
    const repairedToken = `(${token})`;
    return createStep(repairedToken, options);
  }
  if (options.shortcuts.braketScope && token.trim().startsWith('[') && token.trim().endsWith(']')) {
    const repairedToken = token.trim().replace('[', '(').replace(']', ')');
    return createStep(repairedToken, options);
  }

  return { type: 'property', name: token };
}

/**
 * Evaluates a condition using injected condition functions
 * @param cond - Condition string (e.g., 'value.startsWith')
 * @param condValue - Value to compare against
 * @param key - Current key
 * @param value - Current value
 * @param injectedConditions - Custom condition functions
 * @returns Boolean evaluation result
 *
 * Condition Syntax:
 * - 'key.conditionName' - Apply to key (in default 'conditionName' === 'key.conditionName')
 * - '!key.conditionName' - Negate condition Apply to key
 * - 'value.conditionName' - Apply to value
 * - '!value.conditionName' - Negate condition Apply to value
 * - '!conditionName' - Negate condition (in default '!conditionName' === '!key.conditionName')
 */
function evaluateCondition(
  cond: string,
  condValue: any,
  key: string | number,
  value: any,
  injectedConditions: IJsonPatternCondition[] = []
): boolean {
  const [prefix, conditionName] = cond.split('.');
  const negate = prefix.startsWith('!');
  const cleanConditionName = conditionName == undefined ? prefix : conditionName;
  const condition = injectedConditions.find((c) => c.name === cleanConditionName);
  if (!condition) throw new Error(`Condition not found: ${cleanConditionName}`);
  const target = prefix.endsWith('value') ? value : key;
  const result = condition.action(key, value, target, condValue);
  return negate ? !result : result;
}

const makeConditions = <
  CONDITION extends IJsonPatternCondition<NAME>,
  NAME extends string,
  CONDITIONS extends CONDITION[]
>(
  conditions: [...CONDITIONS]
) => {
  return {
    conditions,
    names: conditions.map((i) => {
      return i.name;
    }) as [...CONDITION[]][number]['name'][],
  };
};
const defaultConditions = makeConditions([
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
]);

/**
 * Main traversal function for complex data structures
 * @param data - Input data to traverse
 * @param options - Configuration options
 * @param patterns - Array of pattern strings
 * @param callbacks - Corresponding callbacks for each pattern
 *
 * Features:
 * - Multiple pattern/callback support
 * - Deep nested traversal
 * - In-memory data modification
 * - Conditional filtering
 *
 * Usage:
 * customEach(data, options, patterns, callbacks)
 */
const traverseIn: <
  ENTRY_DATA extends IEntryData,
  OPTIONS extends ICustomEachOptions<[...CONDITIONS], CONDITION, NAME>,
  CONDITIONS extends CONDITION[],
  CONDITION extends IJsonPatternCondition<NAME>,
  NAME extends string
>(
  data: ENTRY_DATA,
  options: OPTIONS,
  patterns: (
    | string
    | string[]
    | ((o: {
        setCondName: (name: OPTIONS['injectedConditions'][number]['name']) => string;
      }) => string)
  )[],
  callbacks: Callback[]
) => void = (data, options, patterns, callbacks) => {
  const defaultShortcuts: IPatternShortcust = {
    singleStar: true,
    doubleStar: true,
    braketScope: false,
    ...options.shortcuts,
  };

  if (patterns.length !== callbacks.length) {
    throw new Error('Patterns and callbacks must have the same length');
  }

  patterns.forEach((_pattern, index) => {
    const setCondName = (v: string) => v;
    const pattern =
      typeof _pattern == 'function'
        ? _pattern({ setCondName })
        : typeof _pattern == 'string'
        ? _pattern
        : _pattern.join('.');
    const steps = parsePattern(pattern, { shortcuts: defaultShortcuts });
    const callback = callbacks[index];
    let currentNodes: TraversalNode[] = [
      {
        node: data,
        parent: null,
        key: null,
        path: [],
      },
    ];

    for (const step of steps) {
      const nextNodes: TraversalNode[] = [];

      for (const { node, parent, key, path } of currentNodes) {
        if (node === null || typeof node !== 'object') continue;

        switch (step.type) {
          case 'property':
            if (typeof node === 'object' && step.name in node) {
              nextNodes.push({
                node: (node as Record<string, any>)[step.name],
                parent: node,
                key: step.name,
                path: [...path, step.name],
              });
            }
            break;

          case 'single-star':
            if (Array.isArray(node)) {
              node.forEach((item, i) =>
                nextNodes.push({
                  node: item,
                  parent: node,
                  key: i,
                  path: [...path, i],
                })
              );
            } else if (typeof node === 'object') {
              Object.entries(node).forEach(([k, v]) =>
                nextNodes.push({
                  node: v,
                  parent: node,
                  key: k,
                  path: [...path, k],
                })
              );
            }
            break;

          case 'double-star':
            const queue: DoubleStarNode[] = [{ node, parent, key, path, depth: 0 }];
            while (queue.length > 0) {
              const { node: curr, parent: p, key: k, path: pth, depth: d } = queue.shift()!;

              nextNodes.push({
                node: curr,
                parent: p,
                key: k,
                path: pth,
              });

              if (step.depth !== undefined && d >= step.depth) continue;

              if (curr && typeof curr === 'object') {
                if (Array.isArray(curr)) {
                  curr.forEach((item, i) =>
                    queue.push({
                      node: item,
                      parent: curr,
                      key: i,
                      path: [...pth, i],
                      depth: d + 1,
                    })
                  );
                } else {
                  Object.entries(curr).forEach(([childKey, childValue]) =>
                    queue.push({
                      node: childValue,
                      parent: curr,
                      key: childKey,
                      path: [...pth, childKey],
                      depth: d + 1,
                    })
                  );
                }
              }
            }
            break;

          case 'single-key':
            if (typeof node === 'object' && step.key in node) {
              nextNodes.push({
                node: (node as Record<string, any>)[step.key],
                parent: node,
                key: step.key,
                path: [...path, step.key],
              });
            }
            break;

          case 'multi-key':
            step.keys.forEach((k) => {
              if (typeof node === 'object' && k in node) {
                nextNodes.push({
                  node: (node as Record<string, any>)[k],
                  parent: node,
                  key: k,
                  path: [...path, k],
                });
              }
            });
            break;

          case 'object-cond':
            if (typeof node === 'object') {
              Object.entries(node).forEach(([childKey, childValue]) => {
                const satisfies = Object.entries(step.conditions).every(([cond, condValue]) =>
                  evaluateCondition(
                    cond,
                    condValue,
                    childKey,
                    childValue,
                    options.injectedConditions
                  )
                );

                if (satisfies) {
                  nextNodes.push({
                    node: childValue,
                    parent: node,
                    key: childKey,
                    path: [...path, childKey],
                  });
                }
              });
            }
            break;

          case 'array-cond':
            if (typeof node === 'object') {
              Object.entries(node).forEach(([childKey, childValue]) => {
                const satisfies = step.conditions.some((conditionSet) =>
                  Object.entries(conditionSet).every(([cond, condValue]) =>
                    evaluateCondition(
                      cond,
                      condValue,
                      childKey,
                      childValue,
                      options.injectedConditions
                    )
                  )
                );

                if (satisfies) {
                  nextNodes.push({
                    node: childValue,
                    parent: node,
                    key: childKey,
                    path: [...path, childKey],
                  });
                }
              });
            }
            break;
        }
      }

      currentNodes = nextNodes;
    }

    currentNodes.forEach(({ node, parent, key, path }) => {
      if (key === null) return; // Skip root node

      callback({
        key: key,
        value: node,
        objectPath: path,
        parent,
        setKey: (newKey: string) => {
          if (parent && !Array.isArray(parent)) {
            (parent as Record<string, any>)[newKey] = node;
            delete (parent as Record<string, any>)[key as string];
          } else {
            throw new Error('Cannot rename array elements or root node');
          }
        },
        remove: () => {
          if (parent && !Array.isArray(parent)) {
            delete (parent as Record<string, any>)[key as string];
          } else {
            throw new Error('Cannot rename array elements or root node');
          }
        },
        removeNears: () => {
          if (parent && !Array.isArray(parent)) {
            const nears = Object.keys(parent).filter((item) => {
              return item !== key;
            });
            nears.forEach((nearKey) => {
              delete (parent as Record<string, any>)[nearKey as string];
            });
          } else {
            throw new Error('Cannot rename array elements or root node');
          }
        },
        setValue: (newValue: any) => {
          if (parent && key !== null) {
            if (Array.isArray(parent)) {
              parent[key as number] = newValue;
            } else {
              (parent as Record<string, any>)[key as string] = newValue;
            }
          } else {
            throw new Error('Cannot set value on root node');
          }
        },
      });
    });
  });
};

const adapter = () => {
  return {
    register: <
      CONDITIONS extends CONDITION[],
      CONDITION extends IJsonPatternCondition<NAME>,
      NAME extends string
    >(
      conditions: CONDITIONS
    ) => {
      return {
        traverseIn: <ENTRY_DATA extends IEntryData>(
          data: ENTRY_DATA,
          patterns: (
            | string
            | ((o: { setCondName: (name: CONDITIONS[number]['name']) => string }) => string)
          )[],
          callbacks: Callback[]
        ) => traverseIn(data, { injectedConditions: conditions }, patterns, callbacks),
      };
    },
  };
};

export default { traverseIn, adapter, defaultConditions: defaultConditions.conditions };
