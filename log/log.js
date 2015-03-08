// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Part I: Rule.prototype.makeCopyWithFreshVarNames() and
//         {Clause, Var}.prototype.rewrite(subst)
// -----------------------------------------------------------------------------

Rule.idCounter = 0;

Rule.prototype.makeCopyWithFreshVarNames = function() {
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

Clause.prototype.rewrite = function(subst) {
  var args = this.args.map(function (t) { return t.rewrite(subst); });
  return new Clause(this.name, args);
};

Var.prototype.rewrite = function(subst) {
  var value = subst.lookup(this.name);
  if (value !== undefined) {
    return value;
  } else {
    return this;
  }
};

// -----------------------------------------------------------------------------
// Part II: Subst.prototype.unify(term1, term2)
// -----------------------------------------------------------------------------

function isVar (o) { return o instanceof Var; }
function isClause (o) { return o instanceof Clause; }

Clause.prototype.hasVar = function (v) {
  return this.args.some(function (t) { return t.hasVar(v); });
};

Var.prototype.hasVar = function (v) {
  return v === this.name;
};

Subst.prototype.unify = function (term1, term2) {
  if (term1 === term2) {
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
  if (this.lookup(name) !== undefined) {
    // name is bound, should unify subst[name] and term
    return this.unify(this.lookup(name), term);
  } else if (isVar(term) && this.lookup(term) !== undefined) {
    // term is a bound variable, should unify name and subst[term]
    return this.unify(new Var(name), this.lookup(term));
  } else if (term.hasVar(name)) {
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

function showStack (stack) {
  var sb = "stack: [\n";
  stack.forEach(function (g) {
    sb += "  ";
    sb += g.show();
    sb += "\n";
  });
  sb += "]";
  return sb;
}

Rule.prototype.rewrite = function (subst) {
  var head = this.head.rewrite(subst),
      body = this.body.map(function (c) { return c.rewrite(subst); });
  return new Rule(head, body);
};

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

Program.prototype.solve = function (trace) {
  var db = new Database();
  // store all facts and rules
  db.addAll(this.rules);
  return this.prove(db, this.query, trace);
};

Program.prototype.prove = function (db, query, trace) {
  var rule = new Rule(new Clause("*root*"), query),
      goal = new Goal(rule, null),
      stack = [goal];
  // TRACE stack
  if (trace) {
    console.log(showStack(stack));
  }
  var loopCount = 0;
  // END TRACE
  return new Iterator(function prove$loop () {
    while (stack.length > 0) {
      if (loopCount >= 500) {
        if (trace) {
          console.log(showStack(stack));
        }
        throw new Error("Something is wrong");
      }
      var goal = stack.pop();
      // TRACE pop
      if (trace) {
        console.log("\u21e1 pop          %s", goal.show());
      }
      // END TRACE
      if (goal.idx >= goal.countPremises()) {
        // finished all subgoals
        var parent = goal.parent;
        if (parent === null) {
          // yield a satisfiable solution
          return new Subst().unifyList(goal.rule.body, query);
        } else {
          // back propagation
          var subst = new Subst().unify(goal.getConclusion(), parent.currentPremise());
          parent = parent.rewrite(subst);
          parent.idx++;
          stack.push(parent);
          // TRACE push
          if (trace) {
            console.log("\u21e3 push parent  %s", parent.show());
          }
          // END TRACE
        }
      } else {
        var clause = goal.currentPremise(),
            rules = db.match(clause);
        rules.reverse();
        rules.forEach(function prove$forEach (r) {
          r = r.makeCopyWithFreshVarNames();
          try {
            var subst = new Subst().unify(clause, r.head);
                subgoal = new Goal(r.rewrite(subst), goal);
            // TRACE stack
            if (trace) {
              console.log("\u21e3 push subgoal %s", subgoal.show());
            }
            // END TRACE
            stack.push(subgoal);
          } catch (e) {
            if (e.message !== "unification failed") {
              throw e;
            } else {
              return;
            }
          }
        });
      }
      loopCount++;
    }
    return false;
  });
};
