import { Rulespace } from 'js-frontend';
import { SchemeParser, Sym, Pair } from './sexp-reader.js';

const schemeProgram = `

(let ((x 1))
  x)

`;

const rulespace = new Rulespace(`

// ast

ast(e) :- $lit(e, _).
ast(e) :- $id(e, _).
ast(e) :- $lam(e, _).
ast(e) :- $let(e, _, _, _).
ast(e) :- $letrec(e, _, _, _).
ast(e) :- $if(e, _, _, _).      
ast(e) :- $app(e, _).

parent(e, p) :- $let(p, e, _, _).
parent(e, p) :- $let(p, _, e, _).
parent(e, p) :- $let(p, _, _, e).
parent(e, p) :- $letrec(p, e, _, _).
parent(e, p) :- $letrec(p, _, e, _).
parent(e, p) :- $letrec(p, _, _, e).
parent(e, p) :- $lam(p, e).
parent(e, p) :- $app(p, e).
parent(e, p) :- arg(e, p, _).
parent(e, p) :- $if(p, e, _, _).
parent(e, p) :- $if(p, _, e, _).
parent(e, p) :- $if(p, _, _, e).

hasParent(e) :- parent(e, _).
astroot(e) :- ast(e), !hasParent(e).

// prim_binding("+", +).
// prim_binding("-", -).
// prim_binding("*", *).
// prim_binding("=", =).
// prim_binding("<", <).

// state machine

reachable(e, 0) :- astroot(e).
reachable(e‘, κ‘) :- reachable(e, κ), step(e, κ, e‘, κ‘).

steps(e, ctx) :- step(e, ctx, _, _).
final(e, ctx) :- reachable(e, ctx), !steps(e, ctx).

// transition relation

step(e, κ, e‘, κ‘) :- $lit(e, _), reachable(e, κ), cont(e, κ, e‘, κ‘).
step(e, κ, e‘, κ‘) :- $id(e, _), reachable(e, κ), cont(e, κ, e‘, κ‘).
step(e, κ, e‘, κ‘) :- $lam(e, _), reachable(e, κ), cont(e, κ, e‘, κ‘).
step(e, κ, e_init, κ) :- $let(e, _, e_init, _), reachable(e, κ).
step(e, κ, e_init, κ) :- $letrec(e, _, e_init, _), reachable(e, κ).
step(e, κ, e_body, call(e, κ)) :- $app(e, e_rator), reachable(e, κ), geval(e_rator, e, κ, obj(e_lam, _, _)), $lam(e_lam, e_body).
step(e, κ, e‘, κ‘) :- $app(e, e_rator), reachable(e, κ), geval(e_rator, e, κ, prim(_)), cont(e, κ, e‘, κ‘).
step(e, κ, e_then, κ) :- $if(e, e_cond, e_then, _), reachable(e, κ), geval(e_cond, e, κ, d), d != false.
step(e, κ, e_else, κ) :- $if(e, e_cond, _, e_else), reachable(e, κ), geval(e_cond, e, κ, d), d = false.

cont(e_init, κ, e_body, κ) :- $let(p, _, e_init, e_body), parent(e, p), reachable(e, κ).
cont(e_init, κ, e_body, κ) :- $letrec(p, _, e_init, e_body), parent(e, p), reachable(e, κ).
cont(e_body, κ, e‘, κ‘) :- $let(p, _, _, e_body), parent(e_body, p), reachable(e_body, κ), cont(p, κ, e‘, κ‘).
cont(e_body, κ, e‘, κ‘) :- $letrec(p, _, _, e_body), parent(e_body, p), reachable(e_body, κ), cont(p, κ, e‘, κ‘).
cont(e_then, κ, e‘, κ‘) :- $if(p, _, e_then, _), parent(e_then, p), reachable(e_then, κ), cont(p, κ, e‘, κ‘).
cont(e_else, κ, e‘, κ‘) :- $if(p, _, _, e_else), parent(e_then, p), reachable(e_then, κ), cont(p, κ, e‘, κ‘).
cont(e_body, κ, e‘, κ‘) :- $lam(p, e_body), parent(e_body, p), step(e_call, κ_call, e_body, κ), cont(e_call, κ_call, e‘, κ‘).

binds(e, x) :- param(_, x, e, _).

evaluated(e, e, κ) :- $lit(e, _), reachable(e, κ).
evaluated(e, e, κ) :- $id(e, _), reachable(e, κ).
evaluated(e, e, κ) :- $lam(e, _), reachable(e, κ).
evaluated(e_rator, e, κ) :- $app(e, e_rator), reachable(e, κ).
evaluated(e_rand, e, κ) :- $app(e, _), arg(e_rand, e, _), reachable(e, κ).
evaluated(e_cond, e ,κ) :- $if(e, e_cond, _, _), reachable(e, κ).

lookup_root(x, e_body, κ, root(e_init, e_init, κ)) :- $let(e, e_id, e_init, e_body), $id(e_id, x), reachable(e, κ).
lookup_root(x, e_init, κ, root(e_init, e_init, κ)) :- $letrec(e, e_id, e_init, _), $id(e_id, x), reachable(e, κ).
lookup_root(x, e_body, κ, root(e_init, e_init, κ)) :- $letrec(e, e_id, e_init, e_body), $id(e_id, x), reachable(e, κ).
lookup_root(x, e_init, κ, r) :- lookup_root(x, p, κ, r), $let(p, _, e_init, _).
lookup_root(x, e_body, κ, r) :- lookup_root(x, p, κ, r), $let(p, e_id, _, e_body), !$id(e_id, x).
lookup_root(x, e_init, κ, r) :- lookup_root(x, p, κ, r), $letrec(p, e_id, e_init, _), !$id(e_id, x).
lookup_root(x, e_body, κ, r) :- lookup_root(x, p, κ, r), $letrec(p, e_id, _, e_body), !$id(e_id, x).
lookup_root(x, e_cond, κ, r) :- lookup_root(x, p, κ, r), $if(p, e_cond, _, _).
lookup_root(x, e_then, κ, r) :- lookup_root(x, p, κ, r), $if(p, _, e_then, _).
lookup_root(x, e_else, κ, r) :- lookup_root(x, p, κ, r), $if(p, _, _, e_else).
lookup_root(x, e_body, κ‘, root(e_rand, e, κ)) :- $app(e, e_rator), $lam(e_lam, e_body),
                                                        param(e_param, x, e_lam, i), arg(e_rand, e, i), step(e, κ, e_body, κ‘).
lookup_root(x, e_body, κ‘, r) :- $app(e, e_rator), geval(e_rator, e, κ, obj(e_lam, e_obj, κ_obj)),
                                      lookup_root(x, e_obj, κ_obj, r), !binds(e_lam, x), step(e, κ, e_body, κ‘).
lookup_root("+", e, κ, false) :- astroot(e), reachable(e, κ). // lookup_root(_, e, κ, false) :- astroot(e), reachable(e, κ).
// lookup_root("-", e, κ, false) :- astroot(e), reachable(e, κ).
// lookup_root("*", e, κ, false) :- astroot(e), reachable(e, κ).
// lookup_root("=", e, κ, false) :- astroot(e), reachable(e, κ).
// lookup_root("<", e, κ, false) :- astroot(e), reachable(e, κ).

geval(e‘, e, κ, d) :- $lit(e‘, d), evaluated(e‘, e, κ).
geval(e‘, e, κ, d) :- $id(e‘, x), evaluated(e‘, e, κ), lookup_root(x, e, κ, root(e_r, e_rs, κ_rs)), geval(e_r, e_rs, κ_rs, d).
geval(e‘, e, κ, prim(x)) :- $id(e‘, x), evaluated(e‘, e, κ), lookup_root(x, e, κ, false). //, prim_binding(x, proc).
geval(e‘, e, κ, obj(e‘, e, κ)) :- $lam(e‘, _), evaluated(e‘, e, κ).
geval(e, e, κ, d) :- $let(e, _, _, e_body), reachable(e, κ), geval(e_body, e_body, κ, d).
geval(e, e, κ, d) :- $letrec(e, _, _, e_body), reachable(e, κ), geval(e_body, e_body, κ, d).
geval(e, e, κ, d) :- $app(e, _), step(e, κ, e_body, κ‘), $lam(_, e_body), geval(e_body, e_body, κ‘, d).
geval(e, e, κ, d) :- $app(e, e_rator), reachable(e, κ), 
                          geval(e_rator, e, κ, prim("+")), arg(e1, e, 0), geval(e1, e, κ, d1), arg(e2, e, 1), geval(e2, e, κ, d2), d := d1 + d2.
geval(e, e, κ, d) :- $if(e, _, _, _), step(e, κ, e_thenelse, κ), geval(e_thenelse, e_thenelse, κ, d).
  
// evaluator

evaluate(e, d) :- final(e, κ), geval(e, e, κ, d).

`);



const ast = new SchemeParser().parse(schemeProgram);
const programTuples = ast2tuples(ast.car);
//console.log(programTuples.join('\n'));


rulespace.addTuples(programTuples);

function param2tuples(p)
{
  return function (param, i)
  {
    if (param instanceof Sym)
    {
      return [['param', param.tag, param.name, p, i]];
    }
    throw new Error(`cannot handle param ${param}`);
  }
}

function arg2tuples(p)
{
  return function (arg, i)
  {
    const argTuples = ast2tuples(arg);
    return [['arg', arg.tag, p, i], ...argTuples];
  }
}

function ast2tuples(ast)
{
  if (ast instanceof String)
  {
    return [['$lit', ast.tag, String(ast)]];
  }
  if (ast instanceof Number)
  {
    return [['$lit', ast.tag, Number(ast)]];
  }
  if (ast instanceof Sym)
  {
    return [['$id', ast.tag, String(ast)]];
  }
  if (ast instanceof Pair)
  {
    const car = ast.car;
    if (car instanceof Sym)
    {
      switch (car.name)
      {
        case "lambda":
        {
          const params = ast.cdr.car;
          const paramTuples = [...params].flatMap(param2tuples(ast.tag));
          const body = ast.cdr.cdr.car;
          const bodyTuples = [...body].flatMap(ast2tuples);
          return [['$lam', ast.tag, body.tag], ...paramTuples, ...bodyTuples];
        }
        case "let":
        {
          const binding = ast.cdr.car;
          const name = binding.car.car;
          const init = binding.car.cdr.car;
          const body = ast.cdr.cdr.car;
          const nameTuples = ast2tuples(name);
          const initTuples = ast2tuples(init);
          const bodyTuples = ast2tuples(body);
          return [['$let', ast.tag, name.tag, init.tag, body.tag], ...nameTuples, ...initTuples, ...bodyTuples];
        }
        case "letrec":
        {
          const binding = ast.cdr.car;
          const name = binding.car.car;
          const init = binding.car.cdr.car;
          const body = ast.cdr.cdr.car;
          const nameTuples = ast2tuples(name);
          const initTuples = ast2tuples(init);
          const bodyTuples = ast2tuples(body);
          return [['$letrec', ast.tag, name.tag, init.tag, body.tag], ...nameTuples, ...initTuples, ...bodyTuples];
        }
        case "if":
        {
          const cond = ast.cdr.car;
          const cons = ast.cdr.cdr.car;
          const alt = ast.cdr.cdr.cdr.car;
          const condTuples = ast2tuples(cond);
          const consTuples = ast2tuples(cons);
          const altTuples = ast2tuples(alt);
          return [['$if', ast.tag, cond.tag, cons.tag, alt.tag], ...condTuples, consTuples, altTuples];
        }
        default:
        {
          const argTuples = [...ast.cdr].flatMap(arg2tuples(ast.tag));
          return [['$app', ast.tag, car.tag], ...argTuples];
        }
      }
    }
  }
  throw new Error(`cannot handle expression ${ast}`);
}

