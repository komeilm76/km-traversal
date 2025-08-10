import _ from 'lodash';
import lib from './lib';
import { IJsonPatternCondition } from './lib/object';
const kmTraversal = lib;
export default kmTraversal;

const { adapter, defaultConditions, traverseIn } = kmTraversal;

// 1. Basic property access
const data1 = { user: { name: 'Alice' } };
console.log(1, 'user.name', 'expected: "Alice"');
traverseIn(
  data1,
  { injectedConditions: defaultConditions },
  ['user.name'],
  [
    ({ value }) => {
      console.log(value); // "Alice"
    },
  ]
);

// 2. Single-star on object
const data2 = { users: { alice: { id: 1 }, bob: { id: 2 } } };
console.log(2, 'users.(*)', 'expected: "1 and 2"');
traverseIn(
  data2,
  { injectedConditions: defaultConditions },
  ['users.(*)'],
  [
    ({ value }) => {
      console.log(value.id); // logs 1 and 2
    },
  ]
);

// 3. Single-star on array
const data3 = { items: [10, 20, 30] };
console.log(3, 'items.(*)', 'expected: "10, 20, 30"');
traverseIn(
  data3,
  { injectedConditions: defaultConditions },
  ['items.(*)'],
  [
    ({ value }) => {
      console.log(value); // logs 10, 20, 30
    },
  ]
);

// 4. Double-star recursive
const data4 = { a: { b: { c: 1 }, d: [2, 3] } };
console.log(4, '(**)', 'expected: "all paths"');
traverseIn(
  data4,
  { injectedConditions: defaultConditions },
  ['(**)'],
  [
    ({ objectPath }) => {
      console.log(objectPath); // logs all paths
    },
  ]
);

// 5. Double-star with depth limit
const data5 = { level1: { level2: { level3: {} } } };
console.log(5, '(*2*)', 'expected: "true (max depth 2)"');
traverseIn(
  data5,
  { injectedConditions: defaultConditions },
  ['(*2*)'],
  [
    ({ objectPath }) => {
      console.log(objectPath.length <= 3); // true (max depth 2)
    },
  ]
);

// 6. Multi-key selection
const data6 = { user: { name: 'Alice', age: 30, email: 'a@b.com' } };
console.log(6, 'user.("name","email")', 'expected: "name" then "email"');
traverseIn(
  data6,
  { injectedConditions: defaultConditions },
  ['user.("name","email")'],
  [
    ({ key }) => {
      console.log(key); // "name" then "email"
    },
  ]
);

// 7. Object condition filtering
const data7 = {
  users: [
    { id: 1, active: true },
    { id: 2, active: false },
  ],
};
console.log(7, 'users.(*).({key.equalWith:"active" value.equalWith:true})', 'expected: 1 only');
traverseIn(
  data7,
  { injectedConditions: defaultConditions },
  ['users.(*).({key.equalWith:"active" value.equalWith:true})'],
  [
    ({ value, parent }) => {
      console.log(parent.id); // 1 only
    },
  ]
);

// 8. Array condition filtering (OR)
const data8 = { products: [{ price: 15 }, { price: 25 }, { price: 8 }] };
console.log(
  8,
  'products.(*).([{key.equalWith:"price",value.<:10},{key.equalWith:"price",value.>:20}])',
  'expected: 25 and 8'
);

traverseIn(
  data8,
  { injectedConditions: defaultConditions },
  ['products.(*).([{key.equalWith:"price",value.<:10},{key.equalWith:"price",value.>:20}]) '],
  [
    ({ value }) => {
      console.log(value); // 25 and 8
    },
  ]
);

// 9. Rename property
const data9 = { profile: { firstName: 'Alice' } };
console.log(9, 'profile.firstName', 'expected: "Alice"');
traverseIn(
  data9,
  { injectedConditions: defaultConditions },
  ['profile.firstName'],
  [
    ({ setKey }) => {
      setKey('name');
    },
  ]
);
// @ts-ignore
console.log(data9.profile.name); // "Alice"

// 10. Modify value
const data10 = { counter: { value: 5 } };
console.log(10, 'counter.value', 'expected: 10');

traverseIn(
  data10,
  { injectedConditions: defaultConditions },
  ['counter.value'],
  [
    ({ setValue }) => {
      setValue(10);
    },
  ]
);
console.log(data10.counter.value); // 10

// 11. Remove property
const data11 = { temp: { removeMe: true, keepMe: 1 } };
console.log(11, 'temp.removeMe', 'expected: false');

traverseIn(
  data11,
  { injectedConditions: defaultConditions },
  ['temp.removeMe'],
  [
    ({ remove }) => {
      remove();
    },
  ]
);
console.log('removeMe' in data11.temp); // false

// 12. Remove nearby properties
const data12 = { obj: { a: 1, b: 2, c: 3 } };
console.log(12, 'obj.b', 'expected: ["b"]');
traverseIn(
  data12,
  { injectedConditions: defaultConditions },
  ['obj.b'],
  [
    ({ removeNears }) => {
      removeNears();
    },
  ]
);
console.log(Object.keys(data12.obj)); // ["b"]

// 13. String condition (startsWith)
const data13 = { users: ['Alice', 'Bob', 'Charlie'] };
console.log(13, "users.({value.startsWith:'C'})", 'expected: "Charlie"');
traverseIn(
  data13,
  { injectedConditions: defaultConditions },
  ["users.({value.startsWith:'C'})"],
  [
    ({ value }) => {
      console.log(value); // "Charlie"
    },
  ]
);

// 14. Numeric condition (between)
const data14 = { scores: [45, 78, 92, 53] };
console.log(14, 'scores.([{value.between:[50,100]}])', 'expected:  78,92,53');
traverseIn(
  data14,
  { injectedConditions: defaultConditions },
  ['scores.([{value.between:[50,100]}])'],
  [
    ({ value }) => {
      console.log(value); // for 78,92,53
    },
  ]
);

// 15. Type checking condition
const data15 = { mixed: ['text', 42, true, null] };
console.log(15, 'mixed.({value.isNumber:true})', 'expected:  "number"');
traverseIn(
  data15,
  { injectedConditions: defaultConditions },
  ['mixed.({value.isNumber:true})'],
  [
    ({ value }) => {
      console.log(typeof value); // "number"
    },
  ]
);

// 16. Custom condition
const isEvenCondition: IJsonPatternCondition = {
  name: 'even',
  action: (_, __, target) => Number.isInteger(target) && target % 2 === 0,
};
const data16 = { numbers: [1, 2, 3, 4, 5] };
console.log(16, 'numbers.({value.even:true})', 'expected:  2 and 4');
traverseIn(
  data16,
  { injectedConditions: [...defaultConditions, isEvenCondition] },
  ['numbers.({value.even:true})'],
  [
    ({ value }) => {
      console.log(value); // 2 and 4
    },
  ]
);

// 17. Array index access
const data17 = { items: ['first', 'second', 'third'] };
console.log(17, 'items.1', 'expected:  "second"');
traverseIn(
  data17,
  { injectedConditions: defaultConditions },
  ['items.1'],
  [
    ({ value }) => {
      console.log(value); // "second"
    },
  ]
);

// 18. Nested patterns
const data18 = {
  groups: [{ users: [{ name: 'A' }, { name: 'B' }] }, { users: [{ name: 'C' }] }],
};
console.log(18, 'groups.(*).users.(*).name', 'expected:  "A", "B", "C"');

traverseIn(
  data18,
  { injectedConditions: defaultConditions },
  ['groups.(*).users.(*).name'],
  [
    ({ value }) => {
      console.log(value); // "A", "B", "C"
    },
  ]
);

// 19. Shortcut syntax
const data19 = { a: { b: { c: 1 } } };
console.log(19, 'a.*.c', 'expected:  1');

traverseIn(
  data19,
  {
    injectedConditions: defaultConditions,
    shortcuts: { singleStar: true, doubleStar: true, braketScope: false },
  },
  ['a.*.c'],
  [
    ({ value }) => {
      console.log(value); // 1
    },
  ]
);

// 20. Root level modification
const data20 = { value: 'root' };
console.log(20, 'value', 'expected:  "modified"');

traverseIn(
  data20,
  { injectedConditions: defaultConditions },
  ['value'],
  [
    ({ setValue }) => {
      setValue('modified');
    },
  ]
);
console.log(data20.value); // "modified"
