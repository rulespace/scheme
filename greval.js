import { SexpParser, sexp2rsp, rsp2js } from 'rulespace';
import { SchemeParser, Sym, Pair } from './sexp-reader.js';

const spec = `

; ast
(rule [ast e] [$lit e _])
(rule [ast e] [$id e _])
(rule [ast e] [$lam e _])
(rule [ast e] [$let e _ _ _])
(rule [ast e] [$letrec e _ _ _])
(rule [ast e] [$if e _ _ _])
(rule [ast e] [$app e _])
; cons car cdr
(rule [ast e] [$cons e _ _])
(rule [ast e] [$car e _])
(rule [ast e] [$cdr e _])

(rule [parent e p] [$let p e _ _])
(rule [parent e p] [$let p _ e _])
(rule [parent e p] [$let p _ _ e])
(rule [parent e p] [$letrec p e _ _])
(rule [parent e p] [$letrec p _ e _])
(rule [parent e p] [$letrec p _ _ e])
(rule [parent e p] [$lam p e])
(rule [parent e p] [$app p e])
(rule [parent e p] [arg e p _])
(rule [parent e p] [$if p e _ _])
(rule [parent e p] [$if p _ e _])
(rule [parent e p] [$if p _ _ e])
; cons car cdr
(rule [parent e p] [$cons p e _])
(rule [parent e p] [$cons p _ e])
(rule [parent e p] [$car p e])
(rule [parent e p] [$cdr p e])

(rule [hasParent e] [parent e _])
(rule [astroot e] [ast e] (not [hasParent e]))

; state machine
(rule [reachable e 0] [astroot e])
(rule [reachable e’ κ’] [reachable e κ] [step e κ e’ κ’])

(rule [steps e κ] [step e κ _ _])
(rule [final e κ] [reachable e κ] (not [steps e κ]))

; transition relation
(rule [step e κ e’ κ’] [$lit e _] [reachable e κ] [cont e κ e’ κ’])
(rule [step e κ e’ κ’] [$id e _] [reachable e κ] [cont e κ e’ κ’])
(rule [step e κ e’ κ’] [$lam e _] [reachable e κ] [cont e κ e’ κ’])
(rule [step e κ e_init κ] [$let e _ e_init _] [reachable e κ])
(rule [step e κ e_init κ] [$letrec e _ e_init _] [reachable e κ])
(rule [step e κ e_body [call e κ]] [$app e e_rator] [reachable e κ] [geval e_rator e κ [obj e_lam _ _]] [$lam e_lam e_body])
(rule [step e κ e’ κ’] [$app e e_rator] [reachable e κ] [geval e_rator e κ [prim _ _]] [cont e κ e’ κ’])
(rule [step e κ e_then κ] [$if e e_cond e_then _] [reachable e κ] [geval e_cond e κ d] (!= d #f))
(rule [step e κ e_else κ] [$if e e_cond _ e_else] [reachable e κ] [geval e_cond e κ d] (= d #f))
; cons car cdr
(rule [step e κ e’ κ’] [$cons e _ _] [reachable e κ] [cont e κ e’ κ’])
(rule [step e κ e’ κ’] [$car e _ ] [reachable e κ] [cont e κ e’ κ’])
(rule [step e κ e’ κ’] [$cdr e _ ] [reachable e κ] [cont e κ e’ κ’])


(rule [cont e_init κ e_body κ] [$let p _ e_init e_body] [parent e p] [reachable e κ])
(rule [cont e_init κ e_body κ] [$letrec p _ e_init e_body] [parent e p] [reachable e κ])
(rule [cont e_body κ e’ κ’] [$let p _ _ e_body] [parent e_body p] [reachable e_body κ] [cont p κ e’ κ’])
(rule [cont e_body κ e’ κ’] [$letrec p _ _ e_body] [parent e_body p] [reachable e_body κ] [cont p κ e’ κ’])
(rule [cont e_then κ e’ κ’] [$if p _ e_then _] [parent e_then p] [reachable e_then κ] [cont p κ e’ κ’])
(rule [cont e_else κ e’ κ’] [$if p _ _ e_else] [parent e_else p] [reachable e_else κ] [cont p κ e’ κ’])
(rule [cont e_body κ e’ κ’] [$lam p e_body] [parent e_body p] [step e_call κ_call e_body κ] [cont e_call κ_call e’ κ’])
; cons car cdr
;(rule [cont e_cons κ e’ κ’] [parent e_body p] [reachable e_body κ] [cont p κ e’ κ’])


; backward var root lookup
(rule [binds e x] [param _ x e _])

(rule [lookup_root x e_body κ [root e_init e_init κ]] [$let e e_id e_init e_body] [$id e_id x] [reachable e κ])
(rule [lookup_root x e_init κ [root e_init e_init κ]] [$letrec e e_id e_init _] [$id e_id x] [reachable e κ])
(rule [lookup_root x e_body κ [root e_init e_init κ]] [$letrec e e_id e_init e_body] [$id e_id x] [reachable e κ])
(rule [lookup_root x e_init κ r] [lookup_root x p κ r] [$let p _ e_init _])
(rule [lookup_root x e_body κ r] [lookup_root x p κ r] [$let p e_id _ e_body] (not [$id e_id x]))
(rule [lookup_root x e_init κ r] [lookup_root x p κ r] [$letrec p e_id e_init _] (not [$id e_id x]))
(rule [lookup_root x e_body κ r] [lookup_root x p κ r] [$letrec p e_id _ e_body] (not [$id e_id x]))
(rule [lookup_root x e_cond κ r] [lookup_root x p κ r] [$if p e_cond _ _])
(rule [lookup_root x e_then κ r] [lookup_root x p κ r] [$if p _ e_then _])
(rule [lookup_root x e_else κ r] [lookup_root x p κ r] [$if p _ _ e_else])
(rule [lookup_root x e_body κ’ [root e_rand e κ]] [$app e e_rator] [$lam e_lam e_body] [param e_param x e_lam i] [arg e_rand e i] [step e κ e_body κ’])
(rule [lookup_root x e_body κ’ r] [$app e e_rator] [geval e_rator e κ [obj e_lam e_obj κ_obj]] [lookup_root x e_obj κ_obj r] (not [binds e_lam x]) [step e κ e_body κ’])

; backward path root lookup
(rule [lookup_path_root e_id "car" e_s κ_s [root e_car e_rs κ_rs]]
          [$id e_id _]
          [geval e_id e_s κ_s [obj e_cons e_rs κ_rs]]
          [$cons e_cons e_car _])
(rule [lookup_path_root e_id "cdr" e_s κ_s [root e_cdr e_rs κ_rs]]
          [$id e_id _]
          [geval e_id e_s κ_s [obj e_cons e_rs κ_rs]]
          [$cons e_cons _ e_cdr])
          

; graph evaluator
(rule [evaluated e e κ] [$lit e _] [reachable e κ])
(rule [evaluated e e κ] [$id e _] [reachable e κ])
(rule [evaluated e e κ] [$lam e _] [reachable e κ])
(rule [evaluated e_rator e κ] [$app e e_rator] [reachable e κ])
(rule [evaluated e_rand e κ] [$app e _] [arg e_rand e _] [reachable e κ])
(rule [evaluated e_cond e κ] [$if e e_cond _ _] [reachable e κ])
; cons car cdr
(rule [evaluated e_car e κ] [$cons e e_car _] [reachable e κ])
(rule [evaluated e_cdr e κ] [$cons e _ e_cdr] [reachable e κ])
(rule [evaluated e_id e_car κ] [$car e_car e_id] [reachable e_car κ])
(rule [evaluated e_id e_cdr κ] [$cdr e_cdr e_id] [reachable e_cdr κ])

(rule [prim2 "+" + 2])
(rule [prim2 "-" - 2])
(rule [prim2 "*" * 2])
(rule [prim2 "=" = 2])
(rule [prim2 "<" < 2])
(rule [prim2 "even?" even? 1])

(rule [geval e’ e κ d] [$lit e’ d] [evaluated e’ e κ])
(rule [geval e’ e κ d] [$id e’ x] [evaluated e’ e κ] [lookup_root x e κ [root e_r e_rs κ_rs]] [geval e_r e_rs κ_rs d])
(rule [geval e’ e κ [prim proc arity]] [$id e’ x] [evaluated e’ e κ] [prim2 x proc arity])
(rule [geval e’ e κ [obj e’ e κ]] [$lam e’ _] [evaluated e’ e κ])
(rule [geval e e κ d] [$let e _ _ e_body] [reachable e κ] [geval e_body e_body κ d])
(rule [geval e e κ d] [$letrec e _ _ e_body] [reachable e κ] [geval e_body e_body κ d])
(rule [geval e e κ d] [$app e _] [step e κ e_body κ’] [$lam _ e_body] [geval e_body e_body κ’ d])
(rule [geval e e κ d] [$app e e_rator] [reachable e κ] [geval e_rator e κ [prim proc 1]] [arg e1 e 0] [geval e1 e κ d1] (:= d (proc d1)))
(rule [geval e e κ d] [$app e e_rator] [reachable e κ] [geval e_rator e κ [prim proc 2]] [arg e1 e 0] [geval e1 e κ d1] [arg e2 e 1] [geval e2 e κ d2] (:= d (proc d1 d2)))
(rule [geval e e κ d] [$if e _ _ _] [step e κ e_thenelse κ] [geval e_thenelse e_thenelse κ d])
; cons car cdr
(rule [geval e_cons e κ [obj e_cons e κ]] [$cons e_cons _ _] [reachable e κ])
(rule [geval e_car e_car κ d]
        [$car e_car e_id] [reachable e_car κ]
        [lookup_path_root e_id "car" e_car κ [root e_r e_rs κ_rs]] [geval e_r e_rs κ_rs d])
(rule [geval e_cdr e_cdr κ d]
        [$cdr e_cdr e_id] [reachable e_cdr κ]
        [lookup_path_root e_id "cdr" e_cdr κ [root e_r e_rs κ_rs]] [geval e_r e_rs κ_rs d])

; evaluator
(rule [evaluate e d] [final e κ] [geval e e κ d])
`;

const evaluatorSexpParser = new SexpParser();
const evaluatorSexp = evaluatorSexpParser.parse(spec);
const evaluatorRsp = sexp2rsp(evaluatorSexp);
const evaluatorSrc = rsp2js(evaluatorRsp);
const evaluatorCtr = new Function(evaluatorSrc);

function toModuleTuple(module, genericTuple)
{
  const pred = genericTuple[0];
  const tupleCtr = module[pred];
  if (!tupleCtr)
  {
    throw new Error(`no constructor for predicate ${pred}`)
  }
  return new tupleCtr(...genericTuple.slice(1));
}

export function greval(src)
{
  const ast = new SchemeParser().parse(src);
  const programTuples = ast2tuples(ast.car); 
  // console.log(programTuples.join('\n'));

  const evaluator = evaluatorCtr();
  evaluator.addTuples(programTuples.map(t => toModuleTuple(evaluator, t)));

  // console.log([...evaluator.tuples()].join('\n'));

  const astrootTuples = [...evaluator.tuples()].filter(t => t.constructor.name === 'astroot');
  if (astrootTuples.length !== 1)
  {
    console.log("program:");
    console.log(src);
    console.log("\nevaluator tuples:")
    console.log([...evaluator.tuples()].join('\n'));
    throw new Error(`wrong number of 'astroot' tuples: ${astrootTuples.length}`);
  }

  const evaluateTuples = [...evaluator.tuples()].filter(t => t.constructor.name === 'evaluate');
  return evaluateTuples.map(t => t.t1);
}

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
    return [['$lit', ast.tag, ast.toString()]];
  }
  if (ast instanceof Number)
  {
    return [['$lit', ast.tag, ast.valueOf()]];
  }
  if (ast instanceof Boolean)
  {
    return [['$lit', ast.tag, ast.valueOf()]];
  }
  if (ast instanceof Sym)
  {
    return [['$id', ast.tag, ast.toString()]];
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
          const body = ast.cdr.cdr.car; // only one body exp allowed (here, and elsewhere)
          const bodyTuples = ast2tuples(body);
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
          return [['$if', ast.tag, cond.tag, cons.tag, alt.tag], ...condTuples, ...consTuples, ...altTuples];
        }
        case "cons":
        {
          const car = ast.cdr.car;
          const cdr = ast.cdr.cdr.car;
          const carTuples = ast2tuples(car);
          const cdrTuples = ast2tuples(cdr);
          return [['$cons', ast.tag, car.tag, cdr.tag], ...carTuples, ...cdrTuples];
        }
        case "car":
        {
          const pair = ast.cdr.car;
          const pairTuples = ast2tuples(pair);
          return [['$car', ast.tag, pair.tag], ...pairTuples];
        }
        case "cdr":
        {
          const pair = ast.cdr.car;
          const pairTuples = ast2tuples(pair);
          return [['$cdr', ast.tag, pair.tag], ...pairTuples];
        }
        default:
        {
          const ratorTuples = ast2tuples(car);
          const argTuples = [...ast.cdr].flatMap(arg2tuples(ast.tag));
          return [['$app', ast.tag, car.tag], ...ratorTuples, ...argTuples];
        }
      }
    }
    else // not a special form
    { // TODO: cloned from default case above
      const ratorTuples = ast2tuples(car);
      const argTuples = [...ast.cdr].flatMap(arg2tuples(ast.tag));
      return [['$app', ast.tag, car.tag], ...ratorTuples, ...argTuples];
    }
  }
  throw new Error(`cannot handle expression ${ast}`);
}


// console.log(greval(`
// (let ((g-car (lambda (p)
//                 (car p))))
//   (let ((g-cdr (lambda (p)
//                   (cdr p))))
//     (let ((p1 (cons 1 2)))
//       (let ((p2 (cons 9 p1)))
//         (let ((f (lambda (p g1 g2)
//           (let ((ca (car p)))
//             (let ((cd (cdr p)))
//               (let ((xx (even? ca)))
//                 (if xx
//                   (g1 cd)
//                   (g2 cd))))))))
//           (f p2 g-car g-cdr))))))`));

console.log(greval(`(< 2 5)`));
          