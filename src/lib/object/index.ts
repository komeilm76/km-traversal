/**
 * Represents entry data that can be an object, array, or nested combination
 */
export type IEntryData = object | any[];

/**
 * Represents a single pattern step in the traversal path
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
 * Condition function definition for object/array conditions
 */
export interface IJsonPatternCondition {
  name: string;
  action: (key: string | number, value: any, target: any, conditionValue: any) => boolean;
}

/**
 * Options for customEach function
 */
export interface CustomEachOptions {
  injectedConditions?: IJsonPatternCondition[];
}

/**
 * Parameters passed to the callback function
 */
export interface CallbackParams {
  key: string | number;
  value: any;
  objectPath: (string | number)[];
  parent: any;
  setKey: (newKey: string) => void;
  setValue: (newValue: any) => void;
}

export type Callback = (params: CallbackParams) => void;

/**
 * Node state during traversal
 */
export interface TraversalNode {
  node: any;
  parent: any;
  key: string | number | null;
  path: (string | number)[];
}

/**
 * Node state for double-star traversal
 */
export interface DoubleStarNode extends TraversalNode {
  depth: number;
}

/**
 * Parses a pattern string into structured PatternStep objects
 */
function parsePattern(pattern: string): PatternStep[] {
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
        if (current) steps.push(createStep(current));
        current = '';
        continue;
      }
    }

    current += char;
  }

  if (current) steps.push(createStep(current));
  return steps;
}

function createStep(token: string): PatternStep {
  if (token.startsWith('(') && token.endsWith(')')) {
    const content = token.substring(1, token.length - 1).trim();

    if (content === '*') return { type: 'single-star' };

    const doubleStarMatch = content.match(/^(\d*)\*\*$/);
    if (doubleStarMatch) {
      return doubleStarMatch[1]
        ? { type: 'double-star', depth: parseInt(doubleStarMatch[1]) }
        : { type: 'double-star' };
    }

    if (content.startsWith('"') && content.endsWith('"') && !content.includes(',')) {
      return { type: 'single-key', key: content.slice(1, -1) };
    }

    if (
      content.includes(',') &&
      content.split(',').every((part) => part.trim().startsWith('"') && part.trim().endsWith('"'))
    ) {
      const keys = content.split(',').map((s) => s.trim().slice(1, -1));
      return { type: 'multi-key', keys };
    }

    if (content.startsWith('{')) {
      try {
        return { type: 'object-cond', conditions: JSON.parse(content) };
      } catch {
        throw new Error(`Invalid object condition: ${content}`);
      }
    }

    if (content.startsWith('[')) {
      try {
        return { type: 'array-cond', conditions: JSON.parse(content) };
      } catch {
        throw new Error(`Invalid array condition: ${content}`);
      }
    }

    throw new Error(`Unrecognized pattern token: ${token}`);
  }

  return { type: 'property', name: token };
}

function evaluateCondition(
  cond: string,
  condValue: any,
  key: string | number,
  value: any,
  injectedConditions: IJsonPatternCondition[] = []
): boolean {
  const [prefix, conditionName] = cond.split(':');
  const negate = prefix.startsWith('!');
  const cleanConditionName = conditionName == undefined ? prefix : conditionName;
  const condition = injectedConditions.find((c) => c.name === cleanConditionName);
  if (!condition) throw new Error(`Condition not found: ${cleanConditionName}`);
  const target = prefix.endsWith('key') ? key : value;
  const result = condition.action(key, value, target, condValue);
  return negate ? !result : result;
}

function customEach(
  data: IEntryData,
  options: CustomEachOptions = {},
  patterns: string[],
  callbacks: Callback[]
): void {
  if (patterns.length !== callbacks.length) {
    throw new Error('Patterns and callbacks must have the same length');
  }

  patterns.forEach((pattern, index) => {
    const steps = parsePattern(pattern);
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
}

export default { customEach };
