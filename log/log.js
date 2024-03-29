/* global Rule, Clause, Var, Num, Program, Subst, console */

'use strict';

// -----------------------------------------------------------------------------
// Part I: Rule.prototype.makeCopyWithFreshVarNames() and
//         {Clause, Var}.prototype.rewrite(subst)
// -----------------------------------------------------------------------------

Rule.idCounter = 0;

Rule.prototype.makeCopyWithFreshVarNames = function () {
  var id = Rule.idCounter++;
  // append $id to all variables
  var head = this.head.rename(id);
  var body = this.body.map(function (c) { return c.rename(id); });
  return new Rule(head, body);
};

Clause.prototype.rename = function (id) {
  var args = this.args.map(function (t) { return t.rename(id); });
  return new Clause(this.name, args);
};

Var.prototype.rename = function (id) {
  return new Var(this.name + '$' + id);
};

Num.prototype.rename = function (id) {
  return this;
};

Clause.prototype.rewrite = function (subst) {
  var args = this.args.map(function (t) { return t.rewrite(subst); });
  return new Clause(this.name, args);
};

Var.prototype.rewrite = function (subst) {
  var value = subst.lookup(this.name);
  if (value !== undefined) {
    return value.rewrite(subst);
  } else {
    return this;
  }
};

Num.prototype.rewrite = function (subst) {
  return this;
};

// -----------------------------------------------------------------------------
// Part II: Subst.prototype.unify(term1, term2)
// -----------------------------------------------------------------------------

// Predicate -------------------------------------------------------------------

function isVar (o) { return o instanceof Var; }
function isNum (o) { return o instanceof Num; }
function isClause (o) { return o instanceof Clause; }

// Free varaiable --------------------------------------------------------------

Clause.prototype.hasVar = function (v, subst) {
  return this.args.some(function (t) { return t.hasVar(v, subst); });
};

Var.prototype.hasVar = function (v, subst) {
  var val = subst.lookup(v);
  if (val === undefined) {
    return v === this.name;
  } else {
    return val.hasVar(v, subst);
  }
};

Num.prototype.hasVar = function (v, subst) {
  return false;
};

// Unification -----------------------------------------------------------------

function isFailedUnification (e) {
  return e.message === "unification failed";
}

Subst.prototype.unify = function (term1, term2) {
  if (term1 === term2) {
    return this;
  } else if (isVar(term1) && isVar(term2) && term1.name === term2.name) {
    return this;
  } else if (isNum(term1) && isNum(term2) && term1.x === term2.x) {
    return this;
  } else if (isVar(term1)) {
    return this.unifyVariable(term1.name, term2);
  } else if (isVar(term2)) {
    return this.unifyVariable(term2.name, term1);
  } else if (isClause(term1) && isClause(term2) && term1.name === term2.name) {
    return this.unifyList(term1.args, term2.args);
  } else {
    throw new Error("unification failed");
  }
};

Subst.prototype.unifyVariable = function (name, term) {
  if (name === '_') {
    return this;
  } else if (isVar(term) && term.name === '_') {
    return this;
  } else if (this.lookup(name) !== undefined) {
    // name is bound, should unify subst[name] and term
    return this.unify(this.lookup(name), term);
  } else if (isVar(term) && this.lookup(term) !== undefined) {
    // term is a bound variable, should unify name and subst[term]
    return this.unify(new Var(name), this.lookup(term));
  } else if (term.hasVar(name, this)) {
    // name is not bound, and term is not bound variable.
    // but name occurred in term
    throw new Error("unification failed");
  } else {
    var subst = this.clone();
    subst.bind(name, term);
    return subst;
  }
};

Subst.prototype.unifyList = function (list1, list2) {
  if (list1.length !== list2.length) {
    throw new Error("unification failed");
  }
  return list1.reduce(function unifyList$reducer (subst, x, idx) {
    return subst.unify(x, list2[idx]);
  }, this);
};

// -----------------------------------------------------------------------------
// Part III: Program.prototype.solve()
// -----------------------------------------------------------------------------

// Humane tracing --------------------------------------------------------------

Goal.prototype.show = function () {
  return "Goal { rule: " + this.rule.show() + "; idx: " + this.idx + " }";
};

Rule.prototype.show = function () {
  var sb = this.head.show();
  if (this.body.length > 0) {
    sb += " :- ";
    sb += this.body.map(function (t) { return t.show(); }).join(", ");
  }
  return sb;
};

Clause.prototype.show = function () {
  var sb = this.name;
  if (this.args.length > 0) {
    sb += "(";
    sb += this.args.map(function (a) { return a.show(); }).join(", ");
    sb += ")";
  }
  return sb;
};

Var.prototype.show = function () {
  return this.name;
};

Num.prototype.show = function () {
  return this.x;
};

// Iterator --------------------------------------------------------------------

function Iterator (next) {
  this.next = next;
}

Iterator.prototype.take = function (n) {
  var l = [];
  for (var i = 0; i < n; i++) {
    var e = this.next();
    if (e) {
      l.push(e);
    } else {
      break;
    }
  }
  return l;
};

Iterator.prototype.drain = function () {
  var l = [];
  while (true) {
    var e = this.next();
    if (e) {
      l.push(e);
    } else {
      return l;
    }
  }
};

// Goal ------------------------------------------------------------------------

function Goal (rule, parent) {
  this.rule = rule;
  this.parent = parent;
  // index of subgoals
  this.idx = 0;
}

Goal.prototype.currentPremise = function () {
  return this.rule.body[this.idx];
};

Goal.prototype.countPremises = function () {
  return this.rule.body.length;
};

Goal.prototype.getConclusion = function () {
  return this.rule.head;
};

Goal.prototype.rewrite = function (subst) {
  var rule = this.rule.rewrite(subst),
      goal = new Goal(rule, this.parent);
  goal.idx = this.idx;
  return goal;
};

Rule.prototype.rewrite = function (subst) {
  var head = this.head.rewrite(subst),
      body = this.body.map(function (c) { return c.rewrite(subst); });
  return new Rule(head, body);
};

// Rule database ---------------------------------------------------------------

function Database () {
  this.rules = Object.create(null);
}

Database.prototype.add = function (rule) {
  var name = rule.head.name;
  if (this.rules[name] === undefined) {
    this.rules[name] = [];
  }
  this.rules[name].push(rule);
};

Database.prototype.addAll = function (rules) {
  rules.forEach(this.add.bind(this));
};

Database.prototype.match = function (clause) {
  var name = clause.name,
      rules = this.rules[name] || [];
  return rules.filter(function (r) {
    return r.head.args.length === clause.args.length;
  });
};

// Alterantive Stack -----------------------------------------------------------

function Stack (trace) {
  this.trace = trace;
  this.stack = [];
}

Stack.prototype.pop = function () {
  var x = this.stack.pop();
  if (this.trace) {
    console.log("\u21e1 pop  %s", x.show());
  }
  return x;
};

Stack.prototype.push = function (x) {
  if (this.trace) {
    console.log("\u21e3 push %s", x.show());
  }
  this.stack.push(x);
};

Stack.prototype.clear = function (x) {
  this.stack.length = 0;
};

Stack.prototype.isEmpty = function () {
  return this.stack.length === 0;
};

Stack.prototype.show = function () {
  var sb = "stack: [\n";
  this.stack.forEach(function (g) {
    sb += "  ";
    sb += g.show();
    sb += "\n";
  });
  sb += "]";
  return sb;
};

// SLD resolution --------------------------------------------------------------

Program.prototype.solve = function (trace) {
  var db = new Database();
  // store all facts and rules
  db.addAll(this.rules);
  return this.prove(db, this.query, trace);
};

Program.prototype.prove = function (db, query, trace) {
  var rule = new Rule(new Clause("*root*"), query),
      goal = new Goal(rule, null),
      stack = new Stack(trace),
      loopCount = 0;
  stack.push(goal);
  return new Iterator(function prove$loop () {
    while (!stack.isEmpty()) {
      // loop limit
      if (loopCount >= 500) {
        stack.show();
        throw new Error("Something is wrong");
      }
      goal = stack.pop();
      if (goal.idx >= goal.countPremises()) {
        // finished all subgoals
        var parent = goal.parent;
        if (parent === null) {
          // yield a satisfiable solution
          return new Subst().unifyList(goal.rule.body, query);
        } else {
          // back propagation
          try {
            var subst = new Subst().unify(goal.getConclusion(), parent.currentPremise());
            parent = parent.rewrite(subst);
            parent.idx++;
            stack.push(parent);
          } catch (e) {
            if (isFailedUnification(e)) {
              continue;
            } else {
              throw e;
            }
          }
        }
      } else {
        // need to prove premises
        var clause = goal.currentPremise();
        if (Program.isBuiltin(clause)) {
          Program.proveBuiltin(clause, goal, stack);
        } else {
          var rules = db.match(clause);
          rules.reverse();
          rules.forEach(function prove$forEach (r) {
            r = r.makeCopyWithFreshVarNames();
            try {
              var subst = new Subst().unify(clause, r.head),
                  subgoal = new Goal(r.rewrite(subst), goal);
              stack.push(subgoal);
            } catch (e) {
              if (isFailedUnification(e)) {
                return;
              } else {
                throw e;
              }
            }
          });
        }
      }
      loopCount++;
    }
    return false;
  });
};

// Negation as failure ---------------------------------------------------------

function cutFail (clause, parent, stack) {
  // not(Goal) :- Goal, !, fail.
  // not(_).
  var name = clause.name,
      goal = clause.args[0],
      rule1 = new Rule(clause, [goal, new Clause('!'), new Clause('fail')]),
      rule2 = new Rule(new Clause(clause.name, [new Var('_')]));
  stack.push(new Goal(rule2, parent));
  stack.push(new Goal(rule1, parent));
}

// Builtin Predicates ----------------------------------------------------------

Clause.prototype.getFunctor = function () {
  return this.name + "/" + this.args.length;
};

Program.builtins = {
  'is/2': function is$2 (clause, parent, stack) {
    var lhs = clause.args[0],
        rhs = clause.args[1];
    try {
      var subst = new Subst().unify(lhs, Program.evalFunction(rhs));
      clause = clause.rewrite(subst);
      stack.push(new Goal(new Rule(clause), parent));
    } catch (e) {
      if (isFailedUnification(e)) {
        return;
      } else {
        throw e;
      }
    }
  },
  '!/0': function cut (clause, parent, stack) {
    stack.clear();
    stack.push(new Goal(new Rule(clause), parent));
  },
  'fail/0': function () {},
  'true/0': function (clause, parent, stack) {
    stack.push(new Goal(new Rule(clause), parent));
  },
  '\\+/1': cutFail,
  'not/1': cutFail,
};

Program.isBuiltin = function (c) {
  return Program.builtins.hasOwnProperty(c.getFunctor());
};

Program.proveBuiltin = function (clause, parent, stack) {
  var functor = clause.getFunctor(),
      predicate = Program.builtins[functor];
  predicate(clause, parent, stack);
};

// Arithmetic Functions --------------------------------------------------------

function makeArithmeticFn (fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments);
    args = args.map(function (value) {
      if (!isNum(value)) {
        throw new Error("`" + value + "/0' is not a function");
      } else {
        return value.x;
      }
    });
    return new Num(fn.apply(null, args));
  };
}

Program.functions = {
  '+/1': makeArithmeticFn(function (x)    { return x;     }),
  '-/1': makeArithmeticFn(function (x)    { return -x;    }),
  '+/2': makeArithmeticFn(function (x, y) { return x + y; }),
  '-/2': makeArithmeticFn(function (x, y) { return x - y; }),
  '*/2': makeArithmeticFn(function (x, y) { return x * y; }),
  '//2': makeArithmeticFn(function (x, y) { return x / y; }),
};

Program.isFunction = function (c) {
  return Program.functions.hasOwnProperty(c.getFunctor());
};

Program.evalFunction = function (expr) {
  if (isClause(expr)) {
    var functor = expr.getFunctor();
    if (Program.isFunction(expr)) {
      var args = expr.args.map(Program.evalFunction);
      return Program.functions[functor].apply(null, args);
    } else {
      throw new Error("`" + functor + "' is not a function");
    }
  } else {
    return expr;
  }
};
