import _ from 'lodash';
import lib from './lib';
const kmTraversal = lib;
export default kmTraversal;

const x = {
  name: 'komeil',
  age: 12,
  meta: {},
};

kmTraversal.traverseIn(
  x,
  { injectedConditions: [] },
  ['(name,age)'],
  [({ remove, removeNears }) => {
    removeNears()
  }]
);

console.log('x', x);
