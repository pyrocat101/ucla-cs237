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
  },
  {
    name: 'cut (1/3)',
    code: 'a(X, Y) :- b(X), !, c(Y).\n' +
          'b(1).\n' +
          'b(2).\n' +
          'b(3).\n' +
          'c(1).\n' +
          'c(2).\n' +
          'c(3).\n' +
          'a(Q,R)?',
    expected: makeIterator(
      { Q: new Num(1), R: new Num(1) },
      { Q: new Num(1), R: new Num(2) },
      { Q: new Num(1), R: new Num(3) }
    )
  },
  {
    name: 'cut (2/3)',
    code: 'a(X) :- b(X), !, c(X).\n' +
          'b(1).\n' +
          'b(2).\n' +
          'b(3).\n' +
          'c(2).\n' +
          'a(Q)?',
    expected: makeIterator()
  },
  {
    name: 'cut (3/3)',
    code: 'a(X) :- b(X), !, c(X).\n' +
          'a(X) :- d(X).\n' +
          'b(1).\n' +
          'b(4).\n' +
          'c(3).\n' +
          'd(4).\n' +
          'a(X)?',
    expected: makeIterator()
  },
  {
    name: 'not (1/2)',
    code: 'man(adam).\n' +
          'woman(eve).\n' +
          'not(man(adam))?',
    expected: makeIterator()
  },
  {
    name: 'not (2/2)',
    code: 'man(adam).\n' +
          'woman(eve).\n' +
          'not(man(abel))?',
    expected: makeIterator({})
  }
);

