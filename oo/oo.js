// Generated by CoffeeScript 1.9.0
'use strict';
var MClass, MObject, MProxy, OO, PM, StringSet, isArray, isFalse, isNull, isNumber, isTrue, many, match, mkNumOpFn, numOps, _,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __hasProp = {}.hasOwnProperty,
  __slice = [].slice;

isTrue = function(o) {
  return o === true;
};

isFalse = function(o) {
  return o === false;
};

isNull = function(o) {
  return o === null;
};

isArray = function(o) {
  return Array.isArray(o);
};

isNumber = function(o) {
  return typeof o === 'number';
};

StringSet = (function() {
  function StringSet(xs) {
    if (isArray(xs)) {
      xs.forEach(this.add.bind(this));
    }
  }

  StringSet.prototype.add = function(x) {
    return this[x] = void 0;
  };

  StringSet.prototype.remove = function(x) {
    return delete this[x];
  };

  StringSet.prototype.contains = function(x) {
    return this.hasOwnProperty(x);
  };

  StringSet.prototype.getLength = function() {
    return Object.keys(this).length;
  };

  StringSet.union = function(xs, ys) {
    var s;
    s = new StringSet;
    Object.keys(xs).forEach(s.add.bind(s));
    Object.keys(ys).forEach(s.add.bind(s));
    return s;
  };

  StringSet.intersect = function(xs, ys) {
    var s;
    s = new StringSet;
    Object.keys(xs).forEach(function(x) {
      if (ys.contains(x)) {
        s.add(x);
      }
    });
    return s;
  };

  return StringSet;

})();

MClass = (function() {
  function MClass(superClass, attrs) {
    this.superClass = superClass;
    this.attrs = new StringSet(attrs);
    if ((attrs != null) && this.attrs.getLength() < attrs.length) {
      throw new Error("duplicate instance variable declaration");
    }
    this.methods = {};
    if (superClass instanceof MClass) {
      if (StringSet.intersect(this.attrs, superClass.attrs).getLength() > 0) {
        throw new Error('duplicate instance variable declaration');
      }
      this.attrs = StringSet.union(this.attrs, superClass.attrs);
    }
  }

  MClass.prototype.hasMethod = function(name) {
    return this.methods.hasOwnProperty(name);
  };

  MClass.prototype.addMethod = function(selector, fn) {
    return this.methods[selector] = fn;
  };

  MClass.prototype.getMethod = function(selector) {
    return this.methods[selector];
  };

  MClass.prototype.hasAttr = function(name) {
    return this.attrs.contains(name);
  };

  MClass.prototype.getSuperclass = function() {
    return this.superClass;
  };

  return MClass;

})();

MObject = (function() {
  function MObject(_at_klass) {
    this.klass = _at_klass;
    this.vars = Object.create(null);
  }

  MObject.prototype.setVar = function(name, value) {
    return this.vars[name] = value;
  };

  MObject.prototype.getVar = function(name) {
    return this.vars[name];
  };

  MObject.prototype.getClass = function() {
    return this.klass;
  };

  MObject.prototype.getEigen = function() {
    return this;
  };

  MObject.prototype.getSuper = function() {
    if (this.klass.getSuperclass() === null) {
      return null;
    } else {
      return new MProxy(this.klass.getSuperclass(), this.getEigen());
    }
  };

  return MObject;

})();

MProxy = (function(_super) {
  __extends(MProxy, _super);

  function MProxy(_at_klass, obj) {
    this.klass = _at_klass;
    this.obj = obj;
    this.vars = obj.vars;
  }

  MProxy.prototype.getEigen = function() {
    return this.obj;
  };

  return MProxy;

})(MObject);

OO = {};

OO.initializeCT = function() {
  this.initObject();
  this.initNumber();
  this.initNull();
  this.initBoolean();
  this.initSingleton();
  return this.initBlock();
};

OO.initObject = function() {
  this.classes = {
    Object: new MClass(null, [])
  };
  this.declareMethod('Object', 'initialize', (function() {}));
  this.declareMethod('Object', 'isNumber', (function() {
    return false;
  }));
  this.declareMethod('Object', '===', function(_this, other) {
    return _this.getEigen() === other.getEigen();
  });
  return this.declareMethod('Object', '!==', function(_this, other) {
    return _this.getEigen() !== other.getEigen();
  });
};

OO.declareClass = function(name, superClassName, instVarNames) {
  var superClass;
  if (this.hasClass(name)) {
    throw new Error('duplicate class declaration');
  }
  superClass = this.getClass(superClassName);
  return this.classes[name] = new MClass(superClass, instVarNames);
};

OO.declareMethod = function(className, selector, implFn) {
  var cls;
  cls = this.getClass(className);
  if (cls.hasMethod(selector)) {
    throw new Error('duplicate method declaration');
  }
  return cls.addMethod(selector, implFn);
};

OO.instantiate = function() {
  var args, className, cls, o;
  className = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
  cls = this.getClass(className);
  o = new MObject(cls);
  this._send(o, 'initialize', args);
  return o;
};

OO._send = function(recv, selector, args) {
  var fn, klass;
  while (recv !== null) {
    klass = recv.getClass();
    if (klass.hasMethod(selector)) {
      fn = klass.getMethod(selector);
      return fn.bind(null, recv).apply(null, args);
    }
    recv = recv.getSuper();
  }
  throw new Error("message not understood: " + selector);
};

OO.send = function() {
  var args, recv, selector;
  recv = arguments[0], selector = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
  recv = this.box(recv);
  return this._send(recv, selector, args);
};

OO.superSend = function() {
  var args, recv, selector, superClassName;
  superClassName = arguments[0], recv = arguments[1], selector = arguments[2], args = 4 <= arguments.length ? __slice.call(arguments, 3) : [];
  recv = this.box(recv);
  recv = new MProxy(this.getClass(superClassName), recv);
  return this._send(recv, selector, args);
};

OO.hasInstVar = function(recv, instVarName) {
  return this.classOf(recv).hasAttr(instVarName);
};

OO.getInstVar = function(recv, instVarName) {
  if (!this.hasInstVar(recv, instVarName)) {
    throw new Error('undeclared instance variable');
  }
  return recv.getVar(instVarName);
};

OO.setInstVar = function(recv, instVarName, value) {
  if (!this.hasInstVar(recv, instVarName)) {
    throw new Error('undeclared instance variable');
  }
  return recv.setVar(instVarName, value);
};

OO.hasClass = function(name) {
  return this.classes.hasOwnProperty(name);
};

OO.getClass = function(name) {
  if (this.hasClass(name)) {
    return this.classes[name];
  } else {
    throw new Error("undefined class: " + name);
  }
};

OO.classOf = function(o) {
  return o.getClass();
};

OO.getSuper = function(o) {
  return o.getSuper();
};

OO.singletons = {};

OO.initSingleton = function() {
  this.singletons.Null = this.instantiate('Null');
  this.singletons.True = this.instantiate('True');
  return this.singletons.False = this.instantiate('False');
};

OO.box = function(x) {
  switch (false) {
    case !isNumber(x):
      return this.instantiate('Number', x);
    case !isTrue(x):
      return this.singletons.True;
    case !isFalse(x):
      return this.singletons.False;
    case !isNull(x):
      return this.singletons.Null;
    default:
      return x;
  }
};

numOps = {
  '+': function(x, y) {
    return x + y;
  },
  '-': function(x, y) {
    return x - y;
  },
  '*': function(x, y) {
    return x * y;
  },
  '/': function(x, y) {
    return x / y;
  },
  '%': function(x, y) {
    return x % y;
  },
  '<': function(x, y) {
    return x < y;
  },
  '>': function(x, y) {
    return x > y;
  },
  '<=': function(x, y) {
    return x <= y;
  },
  '>=': function(x, y) {
    return x >= y;
  },
  '===': function(x, y) {
    return x === y;
  },
  '!==': function(x, y) {
    return x !== y;
  }
};

mkNumOpFn = function(fn) {
  return function(_this, other) {
    var x, y;
    x = OO.getInstVar(_this, 'value');
    y = isNumber(other) ? other : OO.getInstVar(other, 'value');
    return fn(x, y);
  };
};

OO.initNumber = function() {
  var fn, op, _results;
  this.declareClass('Number', 'Object', ['value']);
  this.declareMethod('Number', 'initialize', function(_this, x) {
    return OO.setInstVar(_this, 'value', x);
  });
  this.declareMethod('Number', 'isNumber', function() {
    return true;
  });
  _results = [];
  for (op in numOps) {
    if (!__hasProp.call(numOps, op)) continue;
    fn = numOps[op];
    _results.push(this.declareMethod('Number', op, mkNumOpFn(fn)));
  }
  return _results;
};

OO.initNull = function() {
  return this.declareClass('Null', 'Object');
};

OO.initBoolean = function() {
  this.declareClass('Boolean', 'Object');
  this.declareClass('True', 'Boolean');
  return this.declareClass('False', 'Boolean');
};

OO.initBlock = function() {
  this.declareClass('Block', 'Object', ['fn']);
  this.declareMethod('Block', 'initialize', function(_this, fn) {
    return OO.setInstVar(_this, 'fn', fn);
  });
  return this.declareMethod('Block', 'call', function() {
    var args, fn, _this;
    _this = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    fn = OO.getInstVar(_this, 'fn');
    return fn.apply(null, args);
  });
};

PM = (function() {
  var Many, Predicate, appendMatch, guard, isMany, isPredicate, isWildcard, many, match, matchArray, matchPattern, _;
  _ = {};
  isWildcard = function(o) {
    return o === _;
  };
  isPredicate = function(o) {
    return o instanceof Predicate;
  };
  isMany = function(o) {
    return o instanceof Many;
  };
  Predicate = (function() {
    function Predicate(_at_pred) {
      this.pred = _at_pred;
    }

    return Predicate;

  })();
  Many = (function() {
    function Many(_at_pat) {
      this.pat = _at_pat;
    }

    return Many;

  })();
  guard = function(f) {
    return new Predicate(f);
  };
  many = function(p) {
    return new Many(p);
  };
  appendMatch = function(matched, x) {
    matched.push(x);
    return matched;
  };
  match = function(value) {
    var act, clauses, i, matched, pat;
    clauses = Array.prototype.slice.call(arguments, 1);
    if (clauses.length % 2 !== 0) {
      throw new Error('invalid syntax');
    }
    i = 0;
    while (i < clauses.length) {
      pat = clauses[i];
      act = clauses[i + 1];
      matched = matchPattern(value, pat, []);
      if (!isNull(matched)) {
        return act.apply(null, matched);
      }
      i += 2;
    }
    throw new Error('match failed');
  };
  matchPattern = function(value, pattern, matched) {
    if (isWildcard(pattern)) {
      return appendMatch(matched, value);
    } else if (isPredicate(pattern)) {
      if (pattern.pred(value)) {
        return appendMatch(matched, value);
      } else {
        return null;
      }
    } else if (isArray(pattern) && isArray(value)) {
      return matchArray(pattern, value, matched);
    } else {
      if (pattern === value) {
        return matched;
      } else {
        return null;
      }
    }
  };
  matchArray = function(patterns, values, matched) {
    var i, j, m, pat, subMatched;
    i = 0;
    j = 0;
    while (true) {
      if (i === patterns.length) {
        if (j === values.length) {
          return matched;
        } else {
          return null;
        }
      } else if (j === values.length) {
        while (i < patterns.length) {
          if (!isMany(patterns[i])) {
            return null;
          }
          appendMatch(matched, []);
          i++;
        }
        return matched;
      } else if (isMany(patterns[i])) {
        pat = patterns[i].pat;
        subMatched = [];
        while (true) {
          if (j === values.length) {
            i++;
            break;
          } else {
            m = matchPattern(values[j], pat, subMatched);
            if (isNull(m)) {
              i++;
              break;
            }
            j++;
          }
        }
        matched = appendMatch(matched, subMatched);
      } else {
        matched = matchPattern(values[j], patterns[i], matched);
        if (isNull(matched)) {
          return null;
        }
        i++;
        j++;
      }
    }
  };
  return {
    _: _,
    many: many,
    guard: guard,
    match: match
  };
})();

_ = PM._, many = PM.many, match = PM.match;

O.stmtTags = {
  'program': true,
  'classDecl': true,
  'methodDecl': true,
  'varDecls': true,
  'return': true,
  'setVar': true,
  'setInstVar': true
};

O.isStmt = function(ast) {
  return O.stmtTags.hasOwnProperty(ast[0]);
};

O.transAST = function(ast) {
  return "OO.initializeCT();\n" + (O.translate(ast));
};

O.translate = function(ast) {
  return match(ast, ['program', many(_)], O.translateStmts, ['classDecl', _, _, [many(_)]], O.translateClassDecl, ['methodDecl', _, _, [many(_)], [many(_)]], O.translateMethodDecl, ['varDecls', many([_, _])], O.translateVarDecls, ['return', _], O.translateReturn, ['setVar', _, _], O.translateSetVar, ['setInstVar', _, _], O.translateSetInstVar, ['exprStmt', _], O.translateExprStmt, ['null'], O.translateNull, ['true'], O.translateTrue, ['false'], O.translateFalse, ['number', _], O.translateNumber, ['getVar', _], O.translateGetVar, ['getInstVar', _], O.translateGetInstVar, ["new", _, many(_)], O.translateNew, ['send', _, _, many(_)], O.translateSend, ['super', _, many(_)], O.translateSuperSend, ['block', [many(_)], [many(_)]], O.translateBlock, ['this'], O.translateThis);
};

O.translateStmts = function(stmts) {
  return stmts.map(function(s) {
    return (O.translate(s)) + ";";
  }).join('\n');
};

O.translateClassDecl = function(name, superName, instVars) {
  instVars = instVars.map(function(v) {
    return "\"" + v + "\"";
  }).join(', ');
  return "OO.declareClass('" + name + "', '" + superName + "', [" + instVars + "])";
};

O.translateMethodDecl = function(cls, sel, params, body) {
  body = O.translateStmts(body);
  params = ['_this'].concat(params).join(', ');
  return "OO.declareMethod(\"" + cls + "\", \"" + sel + "\", function (" + params + ") {\n  var __return__ = new Error();\n  var __rr__;\n  try {\n    " + body + "\n  } catch (e) {\n    if (e === __return__) {\n      return __rr__;\n    } else {\n      throw e;\n    }\n  }\n})";
};

O.translateVarDecls = function(bindings) {
  var decls, i, lhs, rhs;
  decls = [];
  i = 0;
  while (i < bindings.length) {
    lhs = bindings[i];
    rhs = O.translate(bindings[i + 1]);
    decls.push(lhs + " = " + rhs);
    i += 2;
  }
  return "var " + (decls.join(',\n'));
};

O.translateReturn = function(ret) {
  return "__rr__ = " + (O.translate(ret)) + "\nthrow __return__";
};

O.translateSetVar = function(lhs, rhs) {
  return lhs + " = " + (O.translate(rhs));
};

O.translateSetInstVar = function(sel, rhs) {
  return "OO.setInstVar(_this, \"" + sel + "\", " + (O.translate(rhs)) + ")";
};

O.translateExprStmt = function(expr) {
  return O.translate(expr);
};

O.translateNull = function() {
  return 'OO.singletons.Null';
};

O.translateTrue = function() {
  return 'OO.singletons.True';
};

O.translateFalse = function() {
  return 'OO.singletons.False';
};

O.translateNumber = function(num) {
  return num;
};

O.translateGetVar = function(sel) {
  return sel;
};

O.translateGetInstVar = function(sel) {
  return "OO.getInstVar(_this, \"" + sel + "\")";
};

O.translateThis = function() {
  return '_this';
};

O.translateNew = function(name, args) {
  args = args.map(function(a) {
    return O.translate(a);
  });
  args = ["\"" + name + "\""].concat(args).join(', ');
  return "OO.instantiate(" + args + ")";
};

O.translateSend = function(recv, sel, args) {
  recv = O.translate(recv);
  args = args.map(function(a) {
    return O.translate(a);
  });
  args = ["\"" + sel + "\""].concat(args).join(', ');
  return "OO.send(" + recv + ", " + args + ")";
};

O.translateSuperSend = function(sel, args) {
  args = args.map(function(a) {
    return O.translate(a);
  });
  args = ["\"" + sel + "\""].concat(args).join(', ');
  return "OO.send(OO.getSuper(_this), " + args + ")";
};

O.translateBlock = function(params, body) {
  var block, i, last;
  block = [];
  if (body.length > 0) {
    i = 0;
    while (i < body.length - 1) {
      block.push(O.translate(body[i]) + ';');
      i++;
    }
    last = body[body.length - 1];
    if (O.isStmt(last)) {
      block.push((O.translate(last)) + ";");
    } else {
      block.push("return " + (O.translate(last)) + ";");
    }
  }
  params = params.join(', ');
  body = block.join('\n');
  return "OO.instantiate('Block', function (" + params + ") {\n  " + body + "\n})";
};
