tests(
  L,
  {
    name: 'is (1/4)',
    code: 'is(1, 1)?',
    expected: makeIterator({})
  },
  {
    name: 'is (2/4)',
    code: 'is(4, +(1, 3))?',
    expected: makeIterator({})
  },
  {
    name: 'is (3/4)',
    code: 'is(X, +(15, *(3, 9)))?',
    expected: makeIterator(
      { X: new Num(42) }
    )
  },
  {
    name: 'is (4/4)',
    code: 'foo(X, Y) :- is(X, 42), is(Y, 43).\n' +
          'foo(X, Y)?',
    expected: makeIterator(
      { X: new Num(42), Y: new Num(43) }
    )
  }
);

