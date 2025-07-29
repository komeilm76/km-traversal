# **km-traversal**

A powerful utility for traversing and transforming complex JavaScript/TypeScript objects using expressive pattern matching.

## Installation

Install my-project with npm

```bash
  npm install km-traversal
```

# API Reference

#### customEach

| Parameter | Type              | Description                                                                              |
| :-------- | :---------------- | :--------------------------------------------------------------------------------------- |
| `obj`     | `T (generic)`     | **Required** The object to traverse (any type)                                           |
| `pattern` | `string`          | **Required** Pattern defining the traversal path using dot notation and special segments |
| `options` | `TraverseOptions` | **Optional**                                                                             |

#### Configuration options:

```typescript
type TraverseOptions = {
  // Operation mode:
  // - 'modify_entry_object': Modifies original object
  // - 'return_new_object': Returns new modified object
  modeOfBehavior: 'modify_entry_object' | 'return_new_object';

  // Custom matching rules
  rules: {
    name: string; // Rule identifier
    rule: (key: string | number) => boolean; // Matching function
  }[];
};
```

#### callback: Callback (Transformation function)

```typescript
type Callback = (
  args: Partial<{
    key: string | number; // Current property key
    value: any; // Current property value
    objectPath: (string | number)[]; // Full path to current node
    parent: any; // Parent object/array
    setValue: <T>(v: T) => T; // Function to update current value
    setKey: <T extends string | number>(v: T) => T; // Function to rename property
  }>
) => void;
```

#### Return Value

- Takes two numbers and returns the sum.
- undefined when modeOfBehavior: 'modify_entry_object'

# Pattern Syntax

#### Patterns use dot notation with special segments:

- **"."** - Path separator (parent.child)
- **"\*"** - Single-level wildcard (matches any key at current level)
- **"**"\*\* - Deep wildcard (matches any key at any depth)
- **"(condition)"** - Condition block in JSON format

## Condition Types

### 1. Fixed Value (its directly using jaascript or typescript example)

##### Matches exact property name
```typescript
'users.["admin"]'; // Matches users.admin
```

### 2. Wildcards

```typescript
'users.*.name'; // All direct child names
'**.password'; // Any password at any depth
```

### 3. Uniques

##### Matches specified properties

```typescript
'methods.({"uniqs":["get","post"]})';
// Matches methods.get and methods.post
```

### 4. Range

##### Matches numeric keys in range

```typescript
'responses.({"from":200,"to":299})';
// Matches responses.200, responses.201, ..., responses.299
```

### 5. String Matching

```typescript
// Starts with prefix
'headers.({"startWith":"x-"})';

// Ends with suffix
'files.({"endWith":".json"})';

// Contains substring
'routes.({"includes":"admin"})';

// Combined conditions
'**.({"startWith":"/api","endWith":"/v1","includes":"users"})';
```

### 6. Custom Rules

##### Uses rules defined in options

```typescript
'**.({"rules":["uuid","password"]})';
```

## Documentation

[Documentation](https://github.com/komeilm76/km-traversal)

## Usage/Examples

#### **1. Basic Property Access**

```typescript
import { customEach } from 'object-traversal-util';

const data = {
  users: [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ],
};

// Extract all names
const names: string[] = [];
customEach(
  data,
  'users.*.name',
  {
    modeOfBehavior: 'return_new_object',
    rules: [],
  },
  ({ value }) => {
    names.push(value);
  }
);
console.log(names); // ['Alice', 'Bob']
```

#### **2. Deep Search with \*\***

```typescript
const config = {
  api: {
    v1: {
      endpoint: 'https://api.example.com/v1',
      auth: {
        token: 'secret-token',
      },
    },
    v2: {
      endpoint: 'https://api.example.com/v2',
    },
  },
};

// Find all tokens at any depth
customEach(
  config,
  '**.token',
  {
    modeOfBehavior: 'modify_entry_object',
    rules: [],
  },
  ({ setValue }) => {
    setValue('REDACTED');
  }
);

console.log(config.api.v1.auth.token); // 'REDACTED'
```

#### **3. String Matching**

```typescript
const openapi = {
  paths: {
    '/users': {
      /* ... */
    },
    '/products': {
      /* ... */
    },
    '/admin/users': {
      /* ... */
    },
  },
};

// Find admin routes
const adminRoutes = [];
customEach(
  openapi,
  'paths.({"includes":"admin"})',
  {
    modeOfBehavior: 'return_new_object',
    rules: [],
  },
  ({ key, value }) => {
    adminRoutes.push({ route: key, definition: value });
  }
);
console.log(adminRoutes);
// [{ route: '/admin/users', definition: { ... } }]
```

#### **4. Custom Rules**

```typescript
const userData = {
  personal: {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    password: 'Secret123!',
    email: 'user@example.com',
  },
};

// Custom validation rules
const isUUID = (key: string | number) =>
  typeof key === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);

const isPassword = (key: string | number) => typeof key === 'string' && key === 'password';

// Redact sensitive fields
customEach(
  userData,
  '**.({"rules":["sensitive"]})',
  {
    modeOfBehavior: 'modify_entry_object',
    rules: [{ name: 'sensitive', rule: (k) => isUUID(k) || isPassword(k) }],
  },
  ({ setValue }) => {
    setValue('**REDACTED**');
  }
);

console.log(userData);
/*
{
  personal: {
    userId: '**REDACTED**',
    password: '**REDACTED**',
    email: 'user@example.com'
  }
}
*/
```

#### **5. Renaming Properties**

```typescript
const product = {
  id: 101,
  old_price: 99.99,
  details: {
    old_sku: 'ABC123',
  },
};

// Rename deprecated properties
customEach(
  product,
  '**.({"startWith":"old_"})',
  {
    modeOfBehavior: 'modify_entry_object',
    rules: [],
  },
  ({ key, setKey }) => {
    if (typeof key === 'string') {
      setKey(key.replace('old_', 'new_'));
    }
  }
);

console.log(product);
/*
{
  id: 101,
  new_price: 99.99,
  details: {
    new_sku: 'ABC123'
  }
}
*/
```

#### **6. Complex API Transformation**

```typescript
const apiSpec = {
  paths: {
    '/login': {
      post: {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
};

// Enhance security for password fields
customEach(
  apiSpec,
  '**.password',
  {
    modeOfBehavior: 'return_new_object',
    rules: [],
  },
  ({ value, setValue }) => {
    setValue({
      ...value,
      format: 'password',
      description: 'Secure password field',
      example: '********',
    });
  }
);
```

## Best Practices

- Combine patterns for efficiency
  Prefer specific paths before wildcards:

```typescript
// More efficient:
'users.*.credentials.password';

// Less efficient:
'**.password';
```

- Use rules for complex matching
  Move complex logic to rules for better performance:

```typescript
rules: [
  {
    name: 'strongPassword',
    rule: (key) =>
      typeof key === 'string' && key.length > 10 && /[A-Z]/.test(key) && /[0-9]/.test(key),
  },
];
```

- Prefer modification mode for large objects
  Avoid cloning overhead with:

```typescript
modeOfBehavior: 'modify_entry_object';
```

- Use setValue/setKey carefully
  These mutate objects immediately during traversal:

```typescript
// Safe usage:
({ setValue }) => setValue(newValue)

// Avoid:
({ parent, key }) => parent[key] = newValue // Bypasses safety checks
```

## Pattern Examples Cheat Sheet

| Pattern                            | Matches                              |
| :--------------------------------- | :----------------------------------- |
| users.\*.name                      | users[any].name                      |
| \*\*.password                      | Any password property at any depth   |
| responses.(200)                    | responses.200                        |
| methods.({"uniqs":["get","post"]}) | methods.get, methods.post            |
| status.({"from":200,"to":299})     | status.200 - status.299              |
| headers.({"startWith":"x-"})       | headers.x-api-key, headers.x-version |
| files.({"endWith":".json"})        | files/config.json, files/data.json   |
| routes.({"includes":"admin"})      | routes/admin, routes/superadmin      |
| \*\*.({"rules":["uuid"]})          | Any property matching "uuid" rule    |

## Limitations

#### **1** Circular References

Objects with circular references may cause infinite recursion

#### **2** Performance Considerations

Deep wildcards on large objects can be expensive

#### **3** Array Key Renaming

setKey doesn't work on array indices

#### **4** Condition Parsing

Conditions must be valid JSON:

```typescript
// Valid:
'({"startWith":"x-"})';

// Invalid:
'({startWith:"x-"})'; // Missing quotes
```

#### **5** No Asynchronous Operations

Callback functions must be synchronous

## Lessons

MIT License
