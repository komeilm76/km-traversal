# **KM-TRAVERSAL**

## Introduction

**traverseIn** is a powerful TypeScript utility for traversing and modifying complex nested data structures (objects and arrays) using expressive pattern syntax. It provides fine-grained control over data traversal with support for deep nesting, conditional filtering, and in-place modifications.

# Key Features

- 🚀 Expressive pattern syntax for precise data navigation
- 🔍 Advanced filtering with key/value conditions
- ✏️ In-place modification of keys and values
- 🌳 Deep recursion with depth control
- ⚡ Multi-key selection for simultaneous access
- 🔄 Dual syntax support for explicit and shortcut patterns
- 🧩 Extensible condition system for custom logic
- 📋 Path tracking with full object paths
- 🧠 Smart quoting for flexible pattern definitions

## Installation

```bash
npm i km-traversal
```

# Core Concepts

## Pattern Syntax

| Pattern Type      | Syntax Example                                  | Description                           |
| :---------------- | :---------------------------------------------- | :------------------------------------ |
| Property Access   | **user.profile**                                | Direct property access                |
| Single Star       | **(\*\)** or **\*** (shortcut)                  | Iterate all immediate children        |
| Double Star       | **(\*\*\)** or **\*\*** (shortcut)              | Recursive descent through all levels  |
| Limited Recursion | **(\*3\*)**                                     | Recursive descent limited to 3 levels |
| Single Key        | **("id")** or **(id)**                          | Access specific property              |
| Multi Key         | **("id","name")** or **(id,name)**              | Access multiple specific properties   |
| Object Condition  | **({"key":"title","value.includes":"urgent"})** | AND conditions on key/value           |
| Array Condition   | **([{"value.>":5},{"value.<":10}])**            | OR of AND conditions                  |

## Condition Syntax

#### Conditions always specify what they target:

- **key.condition**: Applies to the property key
- **value.condition**: Applies to the property value
- **condition**: Alias for **value.condition** (default behavior)

| Pattern                       | Meaning                |
| :---------------------------- | :--------------------- |
| **{"value.startsWith":"a"}**  | Value starts with "a"  |
| **{"key.equalWith":"email"}** | Key is exactly "email" |
| **{"key.includes":"name"}**   | Key contains "name"    |
| **{"isNumber":true}**         | Value is a number      |
| **{"!isArray":true}**         | Value is NOT an array  |

## Default Conditions

#### Key/Value Operations

| Condition | Description           | Example Usage                   |
| :-------- | :-------------------- | :------------------------------ |
| equalWith | Strict equality       | **{"key.equalWith":"email"}**   |
| notEqual  | Strict inequality     | **{"value.notEqual":null}**     |
| includes  | String contains value | **{"value.includes":"urgent"}** |

#### String Operations

| Condition  | Description           | Example Usage                         |
| :--------- | :-------------------- | :------------------------------------ |
| startsWith | Starts with value     | **{"value.startsWith":"https"}**      |
| endsWith   | Ends with value       | **{"value.endsWith":"@gmail.com"}**   |
| matches    | Matches regex pattern | **{"value.matches":"\\d{3}-\\d{4}"}** |

#### Numeric Operations

| Condition   | Description        | Example Usage                |
| :---------- | :----------------- | :--------------------------- |
| greaterThan | > value            | **{"value.greaterThan":18}** |
| lessThan    | < value            | **{"value.lessThan":100}**   |
| between     | Between [min, max] | **{"value.between":[5,10]}** |

#### Type Checking

| Condition | Description  | Example Usage               |
| :-------- | :----------- | :-------------------------- |
| isString  | String type  | **{"value.isString":true}** |
| isNumber  | Number type  | **{"value.isNumber":true}** |
| isArray   | Array type   | **{"value.isArray":true}**  |
| isObject  | Plain object | **{"value.isObject":true}** |

#### Array Operations

| Condition     | Description            | Example Usage                       |
| :------------ | :--------------------- | :---------------------------------- |
| arrayIncludes | Array contains value   | **{"value.arrayIncludes":"admin"}** |
| length        | Array has exact length | **{"value.length":5}**              |

## API Reference

#### Core Functions

```typescript
// code...
traverseIn<ENTRY_DATA, OPTIONS>(
  data: ENTRY_DATA,  // Data to traverse (object or array)
  options: ICustomEachOptions,  // Configuration options
  patterns: (  // Array of traversal patterns
    string |
    string[] |
    (({setCondName}) => string)
  )[],
  callbacks: Callback[]  // Functions to execute at target nodes
): void
```

#### Adapter Pattern

```typescript
// code...
const { register } = adapter();
const traverser = register(customConditions);

traverser.traverseIn(data, patterns, callbacks);
```

#### Callback Parameters

```typescript
// code...
callback({
  key: string | number,     // Current key/index
  value: any,               // Current value
  objectPath: (string | number)[], // Full path to node
  parent: any,              // Parent object/array
  setKey: (newKey: string) => void, // Rename property
  setValue: (newValue: any) => void, // Modify value
  remove: () => void, // Delete Value
  removeNears: () => void // Delete Near Values
})
```

#### Configuration Options

| Option                   | Type    | Default  | Description                               |
| :----------------------- | :------ | :------- | :---------------------------------------- |
| **injectedConditions**   | Array   | Required | Custom conditions to extend functionality |
| **shortcuts.singleStar** | boolean | true     | Enable \* syntax for single-star          |
| **shortcuts.doubleStar** | boolean | true     | Enable \*\* syntax for double-star        |

## Usage Examples

#### Basic Traversal

```typescript
// code...
import { traverseIn, defaultConditions } from './traverseIn';

const data = {
  users: [
    { id: 1, name: 'John', contact: { email: 'john@example.com' } },
    { id: 2, name: 'Jane', contact: { email: 'jane@example.com' } },
  ],
};

// Convert all emails to uppercase
traverseIn(
  data,
  { injectedConditions: defaultConditions },
  ['users.(*).contact.email'],
  [
    ({ value, setValue }) => {
      setValue(value.toUpperCase());
    },
  ]
);
```

#### Advanced Filtering

```typescript
// code...
const productData = {
  inventory: [
    { id: 1, title: 'Laptop', price: 1200, tags: ['electronics', 'premium'] },
    { id: 2, title: 'Desk Lamp', price: 35, tags: ['furniture'] },
    { id: 3, title: 'Monitor', price: 300, tags: ['electronics'] },
  ],
};

// Find electronics under $1000
traverseIn(
  productData,
  { injectedConditions: defaultConditions },
  [
    'inventory.([{ "key:equalWith":"price", "value.lessThan":1000},{ "key:equalWith":"tags", "value.arrayIncludes":"electronics"}])',
  ],
  [
    ({ value }) => {
      console.log('Filtered item:', value.title);
      // Outputs: "Desk Lamp" and "Monitor"
    },
  ]
);
```

#### Key-Based Operations

```typescript
// code...
const userData = {
  user_list: [
    { user_id: 1, user_name: 'John' },
    { user_id: 2, user_name: 'Jane' },
  ],
};

// Rename user_id to id
traverseIn(
  userData,
  { injectedConditions: defaultConditions },
  ['user_list.(*).user_id'],
  [
    ({ setKey }) => {
      setKey('id');
    },
  ]
);

// Find keys containing "name"
traverseIn(
  userData,
  { injectedConditions: defaultConditions },
  ['user_list.(*).({"key.includes":"name"})'],
  [
    ({ value }) => {
      console.log('Name property:', value);
    },
  ]
);
```

#### Recursive Search

```typescript
// code...
const nestedData = {
  a: {
    b: {
      c: 'Target 1',
      d: { e: 'Target 2' },
    },
    f: { g: 'Target 3' },
  },
};

// Find all string values starting with "Target"
traverseIn(
  nestedData,
  { injectedConditions: defaultConditions },
  [['(**)']],
  [
    ({ value, objectPath }) => {
      if (typeof value === 'string' && value.startsWith('Target')) {
        console.log(`Found ${value} at: ${objectPath.join('.')}`);
      }
    },
  ]
);
```

#### Custom Conditions

```typescript
// code...
const customConditions = [
  ...defaultConditions,
  {
    name: 'validEmail',
    action: (_, __, target) =>
      typeof target === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target),
  },
  {
    name: 'isEven',
    action: (_, __, target) => typeof target === 'number' && target % 2 === 0,
  },
];

const data = {
  contacts: [
    { id: 1, email: 'john@example.com' },
    { id: 2, email: 'invalid' },
    { id: 3, email: 'jane@example.com' },
  ],
};

// Validate emails and even IDs
traverseIn(
  data,
  { injectedConditions: customConditions },
  ['contacts.(*).email.({"value.validEmail":true})', 'contacts.(*).id.({"value.isEven":true})'],
  [({ value }) => console.log('Valid email:', value), ({ value }) => console.log('Even ID:', value)]
);
```

#### Using the Adapter

```typescript
// code...
import { adapter } from './traverseIn';

// Create reusable traverser with custom conditions
const productTraverser = adapter().register([
  ...defaultConditions,
  {
    name: 'inStock',
    action: (_, value) => value.inventory > 0,
  },
  {
    name: 'onSale',
    action: (_, value) => value.discount > 0,
  },
]);

const products = {
  items: [
    { id: 1, name: 'Laptop', price: 1200, inventory: 5, discount: 0 },
    { id: 2, name: 'Mouse', price: 25, inventory: 0, discount: 5 },
    { id: 3, name: 'Keyboard', price: 45, inventory: 10, discount: 10 },
  ],
};

// Find products that are in stock AND on sale
productTraverser.traverseIn(
  products,
  ['items.(*).({"value.inStock":true,"value.onSale":true})'],
  [
    ({ value }) => {
      console.log('Available on sale:', value.name);
      // Outputs: "Keyboard"
    },
  ]
);
```

## Pattern Cheat Sheet

#### Basic Navigation

| Pattern                | Matches                                  |
| :--------------------- | :--------------------------------------- |
| **users.name**         | Direct property: **data.users.name**     |
| **items.(\*)**         | All elements in **data.items** array     |
| **products.(\*\*)**    | All nested properties under **products** |
| **categories.(\*3\*)** | Recursive search up to 3 levels deep     |
| **("metadata")**       | Property named "metadata"                |
| **(id,name)**          | Both "id" and "name" properties          |

#### Condition Patterns

| Pattern                                             | Matches                            |
| :-------------------------------------------------- | :--------------------------------- |
| **({"key":"email"})**                               | Properties with key "email"        |
| **({"value.includes":"error"})**                    | Values containing "error"          |
| **({"key.includes":"date","value.isString":true})** | Date properties with string values |
| **([{"value.<":100},{"value.>":1000}])**            | Values < 100 OR > 1000             |

#### Complex Examples

```typescript
// code...
// Find active users with phone numbers
'users.(*).([{"key:equalWith":"status","value.equalWith":"active",},{"equalWith":"phone","value.exists":true}])';

// Find titles containing "urgent" in first 3 levels
'documents.(*3*).({"key.equalWith":"title","value.includes":"urgent"})';

// Find prices between $10-$100 in electronics
'inventory.([{"category":"electronics"}]).prices.({"value.between":[10,100]})';

// Rename all _id properties to id
'(**).({"key.equalWith":"_id"}).setKey("id")';
```

#### Tips & Best Practices

- 1.Specificity First: Start patterns with specific keys before recursive descent

```typescript
// code...
// Good:
'users.(*).contacts.(**)';

// Less efficient:
'(**).contacts';
```

- 2.Combine Conditions: Use object conditions for AND, array conditions for OR

```typescript
// code...
// AND: Must satisfy all conditions
'({"value.isNumber":true,"value.>":10})';

// OR: Satisfy any condition set
'([{"status":"active"},{"priority.greaterThan":3}])';
```

- 3.Use Key/Value Specificity: Always specify key/value in conditions

```typescript
// code...
// Recommended:
'({"key.includes":"date","value.isString":true})';

// Avoid:
'({"includes":"date"})'; // Ambiguous
```

- 4.Batch Operations: Process multiple patterns in single traversal

```typescript
// code...
traverseIn(data, options, ['users.(*).name', 'users.(*).email'], [nameProcessor, emailProcessor]);
```

- 5.Depth Control: Limit recursion depth in large datasets

```typescript
// code...
// Limit to 4 levels deep
'largeDataset.(*4*)';
```

- 6.Path Utilization: Use objectPath for context-aware operations

```typescript
// code...
callback: ({ value, objectPath }) => {
  if (objectPath[objectPath.length - 1] === 'email') {
    // Special handling for email fields
  }
};
```

## Limitations

- **Circular References:** Not supported (will cause infinite loops)
- **Large Datasets:** Deep recursion may impact performance
- **Concurrent Modification:** Changing structure during traversal may cause unexpected behavior
- **Type Strictness:** Conditions require explicit type handling
- **Pattern Complexity:** Highly complex patterns may have parsing overhead

## Real-World Use Cases

- **1.Data Migration:** Rename keys and transform values across complex structures
- **2.Validation:** Verify data integrity in API payloads
- **3.Security Scans:** Find sensitive data patterns (credit cards, tokens)
- **4.Data Cleaning:** Normalize formats (phone numbers, emails)
- **5.Feature Flags:** Conditionally modify configuration trees
- **6.Analytics:** Extract specific metrics from complex event data
- **7.Schema Enforcement:** Ensure data matches required structure

```typescript
// code...
// Real-world example: GDPR compliance
traverseIn(
  userData,
  { injectedConditions },
  [
    '(**).({"key.includes":"email","value.isString":true})',
    '(**).({"key.includes":"phone","value.isString":true})',
  ],
  [
    // Anonymize PII data
    ({ setValue }) => setValue('REDACTED'),
  ]
);
```

## Contributing

#### Contributions are welcome! Please follow these steps:

- Fork the repository
- Create a feature branch
- Add tests for new functionality
- Submit a pull request

## License

#### MIT License
