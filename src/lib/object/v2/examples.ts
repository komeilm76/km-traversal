// =============================================================================
// ------------------------ DOCUMENTATION & EXAMPLES ---------------------------
// =============================================================================

/**
 * INJECTED CONDITIONS LIBRARY
 *
 * Pre-built conditions for common use cases:
 *
 * 1. STRING OPERATIONS
 *    - startsWith: Check if string starts with value
 *    - endsWith: Check if string ends with value
 *    - includes: Check if string contains value
 *    - matches: Test against regex pattern
 *
 * 2. COMPARISON OPERATIONS
 *    - equalWith: Strict equality (===)
 *    - notEqual: Strict inequality (!==)
 *    - greaterThan: Numeric comparison (>)
 *    - lessThan: Numeric comparison (<)
 *    - between: Check if number is in range
 *
 * 3. TYPE CHECKING
 *    - isString: Check if value is string
 *    - isNumber: Check if value is number
 *    - isArray: Check if value is array
 *    - isObject: Check if value is object
 *
 * 4. ARRAY OPERATIONS
 *    - includes: Check if array contains value
 *    - length: Check array length
 *
 * Example Conditions:
 */

/**
 * PATTERN EXAMPLES
 *
 * 1. Basic traversal:
 *    - 'users.(*).name'
 *      → All names in users array
 *
 * 2. Deep nested search:
 *    - 'inventory.(**).serialNumber'
 *      → All serialNumbers anywhere in inventory
 *
 * 3. Filtered selection:
 *    - 'products.({"value:greaterThan":100})'
 *      → Products with value > 100
 *
 * 4. Multi-condition filtering:
 *    - 'employees.([{"department:equalWith":"IT"},{"status:equalWith":"active"}])'
 *      → IT department OR active employees
 *
 * 5. Key-based selection:
 *    - 'data.("settings","config")'
 *      → Both settings and config objects
 *
 * 6. Complex mixed pattern:
 *    - 'users.(*).posts.(**).({"timestamp:between":[1625097600,1627689600]})'
 *      → Posts within date range for all users
 */

/**
 * USAGE EXAMPLES
 *
 * Example 1: Collect all email addresses
 * -------------------------------------
 * const data = { users: [{ email: 'a@test.com' }, { email: 'b@test.com' }] };
 * const emails: string[] = [];
 *
 * customEach(
 *   data,
 *   {},
 *   ['users.(*).email'],
 *   [({ value }) => emails.push(value)]
 * );
 *
 * Example 2: Modify inactive users
 * --------------------------------
 * const conditions = [{
 *   name: 'equalWith',
 *   action: (_, __, target, condition) => target === condition
 * }];
 *
 * customEach(
 *   userData,
 *   { injectedConditions: conditions },
 *   ['users.({"status:equalWith":"inactive"})'],
 *   [({ setValue }) => setValue({ ...user, status: 'archived' })]
 * );
 *
 * Example 3: Find high-value transactions
 * ---------------------------------------
 * customEach(
 *   transactionData,
 *   {},
 *   ['transactions.([{"amount:greaterThan":1000},{"currency:equalWith":"USD"}])'],
 *   [({ value }) => console.log('High value:', value)]
 * );
 *
 * Example 4: Recursive search for error messages
 * ----------------------------------------------
 * customEach(
 *   logData,
 *   {},
 *   ['logs.(**).("error","warning")'],
 *   [({ key, value }) => console.log(`${key}: ${value.message}`)]
 * );
 *
 * Example 5: Multi-pattern processing
 * -----------------------------------
 * customEach(
 *   companyData,
 *   {},
 *   [
 *     'departments.(*).name',
 *     'employees.({"title:includes":"Manager"})'
 *   ],
 *   [
 *     ({ value }) => console.log('Department:', value),
 *     ({ value }) => console.log('Manager:', value.name)
 *   ]
 * );
 */
