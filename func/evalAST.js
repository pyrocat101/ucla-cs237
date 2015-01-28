'use strict';

// Type predicates -------------------------------------------------------------

var numberTag = '[object Number]',
    boolTag = '[object Boolean]';

var objectProto = Object.prototype,
    objToString = objectProto.toString;

function isObjectLike(value) {
  return (value && typeof value == 'object') || false;
}

function isNumber(value) {
  return typeof value == 'number' || (isObjectLike(value) && objToString.call(value) == numberTag) || false;
}

function isBoolean(value) {
  return (value === true || value === false || isObjectLike(value) && objToString.call(value) == boolTag) || false;
}

function isNull(value) {
  return value === null;
}

function isAtom(value) {
  return isNull(value) || isBoolean(value) || isNumber(value);
}

var isArray = Array.isArray;

function isClosure(value) {
  return isArray(value) && value.length > 0 && value[0] === 'closure' || false;
}

function isCons(value) {
  return isArray(value) && value.length > 0 && value[0] === 'cons' || false;
}

function isID(value) {
  return isArray(value) && value.length > 0 && value[0] === 'id' || false;
}

function isWildcard(value) {
  return isArray(value) && value.length === 1 && value[0] === '_';
}

function isObject(value) {
  var type = typeof value;
  return type == 'function' || (value && type == 'object') || false;
}

function isAtomEqual(x, y) {
  x = isObject(x) ? x.valueOf() : x;
  y = isObject(y) ? y.valueOf() : y;
  return x === y;
}

function isUndefined(value) {
  return typeof value == 'undefined';
}

// Variable bindings -----------------------------------------------------------

var Env = function (name, value, enclose) {
  this.name = name;
  this.value = value;
  this.enclose = enclose;
}
Env.empty = new Env(null, null, null);

Env.prototype.put = function (name, value) {
  return new Env(name, value, this)
}

Env.prototype.assq = function (name) {
  var env = this;
  while (env !== Env.empty) {
    if (env.name === name) {
      return env;
    }
    env = env.enclose;
  }
  throw new Error("KeyError: " + name);
}

Env.prototype.get = function (name, value) {
  return this.assq(name).value;
}

Env.prototype.set = function (name, value) {
  this.assq(name).value = value;
}

// Evaluation ------------------------------------------------------------------

function makeClosure(params, body, env) {
  return ['closure', params, body, env];
}

function makeCons(car, cdr) {
  return ['cons', car, cdr];
}

function consFoldr(cons, f, acc) {
  if (isNull(cons)) {
    return acc;
  } else if (isCons(cons)) {
    var car = cons[1],
        cdr = cons[2];
    acc = consFoldr(cdr, f, acc);
    return f(acc, car);
  } else {
    throw new Error("TypeError: " + cons + " is not a cons");
  }
}

var operators = {
  '+': function (x, y) { return x + y; },
  '-': function (x, y) { return x - y; },
  '*': function (x, y) { return x * y; },
  '/': function (x, y) { return x / y; },
  '%': function (x, y) { return x % y; },
  '<': function (x, y) { return x < y; },
  '>': function (x, y) { return x > y; },
  '=': function (x, y) { return x === y; },
  '!=': function (x, y) { return x !== y; },
}

function numericOp(ast, env) {
  var op = operators[ast[0]],
      x = evalML(env)(ast[1]),
      y = evalML(env)(ast[2]);
  if (isNumber(x) && isNumber(y)) {
    return op(x, y);
  } else {
    throw new Error("TypeError: unsupported operand type for " + op + ": " + typeof x + " and " + typeof y);
  }
}

function generalOp(ast, env) {
  var op = operators[ast[0]],
      x = evalML(env)(ast[1]),
      y = evalML(env)(ast[2]);
  return op(x, y);
}

function evalToBoolean(ast, env, op) {
  var value = evalML(env)(ast);
  if (!isBoolean(value)) {
    throw new Error("TypeError: unsupported operand type for " + op + ": " + typeof value);
  } else {
    return value;
  }
}

function evalCall(callee, args) {
  var params = callee[1],
      body = callee[2],
      env = callee[3];
  if (params.length < args.length)
    throw new Error("TypeError: function takes at most "+ params.length + " "+ (params.length <= 1 ? "argument" : "arguments") + " (" + args.length + " given)");

  env = args.reduce(function (env, arg, i) {
    return env.put(params[i], arg);
  }, env);

  if (params.length === args.length) {
    return evalML(env)(body);
  } else {
    // currying
    return makeClosure(params.slice(args.length), body, env);
  }
}

var evaluators = {
  // ['id', x]
  'id': function (ast, env) {
    var name = ast[1];
    return env.get(name);
  },
  // ['fun', [x1, x2, ...], e]
  'fun': function (ast, env) {
    var params = ast[1],
        body = ast[2];
    return makeClosure(params, body, env);
  },
  // ['call', ef, e1, e2, ...]
  'call': function (ast, env) {
    var callee = evalML(env)(ast[1]),
        args = ast.slice(2).map(evalML(env));
    if (!isClosure(callee))
      throw Error("TypeError: " + ast + " is not callable");

    return evalCall(callee, args);
  },
  // ['let', x, e1, e2]
  'let': function (ast, env) {
    var name = ast[1],
        value = ast[2],
        body = ast[3];
    env = env.put(name, undefined);
    // let/rec
    env.value = evalML(env)(value);
    return evalML(env)(body);
  },
  // ['if', e1, e2, e3]
  'if': function (ast, env) {
    var test = ast[1],
        thn = ast[2],
        els = ast[3];
    return evalML(env)(test) ? evalML(env)(thn) : evalML(env)(els);
  },
  // [op, e1, e2]
  '+': numericOp,
  '-': numericOp,
  '*': numericOp,
  '/': numericOp,
  '%': numericOp,
  '<': numericOp,
  '>': numericOp,
  '=': generalOp,
  '!=': generalOp,
  'and': function (ast, env) {
    var x = ast[1],
        y = ast[2];
    return evalToBoolean(x, env, "&&") && evalToBoolean(y, env, "&&");
  },
  'or': function (ast, env) {
    var x = ast[1],
        y = ast[2];
    return evalToBoolean(x, env, "||") || evalToBoolean(y, env, "||");
  },
  // ['cons', e1, e2]
  'cons': function (ast, env) {
    var car = evalML(env)(ast[1]),
        cdr = evalML(env)(ast[2]);
    return makeCons(car, cdr);
  },
  // ['match', e, p1, e1, p2, e2, ...]
  'match': function (ast, env) {
    var expr = evalML(env)(ast[1]),
        clauses = ast.slice(2);
    for (var i = 0; i < clauses.length; i += 2) {
      var pattern = clauses[i],
          action = clauses[i + 1],
          newEnv = patternMatch(pattern, expr, env);
      if (!isNull(newEnv)) {
        return evalML(newEnv)(action);
      }
    }
    throw new Error("ValueError: pattern matching exhausted");
  },
  // ['set', x, e]
  'set': function (ast, env) {
    var lhs = ast[1],
        rhs = evalML(env)(ast[2]);
    env.set(lhs, rhs);
    return rhs;
  },
  // ['seq', e1, e2]
  'seq': function (ast, env) {
    var head = ast[1],
        tail = ast[2];
    evalML(env)(head);
    return evalML(env)(tail);
  },
  // ['listComp', e, x, elist, [, epred]]
  'listComp': function (ast, env) {
    var map = ast[1],
        iter = ast[2],
        target = evalML(env)(ast[3]),
        pred = ast.length === 5 ? ast[4] : undefined;
    return consFoldr(target, function (acc, x) {
      var newEnv = env.put(iter, x);
      if (!isUndefined(pred) && !evalML(newEnv)(pred)) {
        return acc;
      } else {
        return makeCons(evalML(newEnv)(map), acc);
      }
    }, null);
  },
  // ['delay', e]
  'delay': function (ast, env) {
    var value = ast[1];
    return makeClosure([], value, env);
  },
  // ['force', e]
  'force': function (ast, env) {
    var value = evalML(env)(ast[1]);
    if (isClosure(value)) {
      return evalCall(value, []);
    } else {
      throw new Error("TypeError: " + value + " is not a thunk");
    }
  },
}

function patternMatch(pat, expr, env) {
  if (isAtom(pat) && isAtomEqual(pat, expr)) {
    return env;
  } else if (isCons(pat) && isCons(expr)) {
    var patCar = pat[1],
        patCdr = pat[2],
        exprCar = expr[1],
        exprCdr = expr[2],
        newEnv = patternMatch(patCar, exprCar, env);
    return newEnv && patternMatch(patCdr, exprCdr, newEnv);
  } else if (isWildcard(pat)) {
    return env;
  } else if (isID(pat)) {
    var name = pat[1];
    return env.put(name, expr);
  } else {
    return null;
  }
}

function evalML(env) {
  return function (ast) {
    if (isAtom(ast)) {
      return ast;
    } else if (isArray(ast)) {
      return evaluators[ast[0]](ast, env);
    } else {
      throw new Error("TypeError: " + ast + " is not evaluable");
    }
  };
}

// Prelude ---------------------------------------------------------------------

F.evalAST = function (ast) {
  var env = Env.empty;
  return evalML(env)(ast);
};
