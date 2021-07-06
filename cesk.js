import {assertTrue, Characters, MutableMaps} from 'common';
import { sexp2rsp, rsp2js, SexpParser } from 'rulespace';
import { SchemeParser, Sym, Pair } from './sexp-reader.js';


const schemeProgram = `

(let ((x 10)) x)

`;

const ceskspec =
`

;; ast

(rule [Ast e] [Lit e _])
(rule [Ast e] [Id e _])
(rule [Ast e] [Lam e _])
(rule [Ast e] [Let e _ _ _])
(rule [Ast e] [Letrec e _ _ _])
(rule [Ast e] [If e _ _ _])
(rule [Ast e] [App e _])

(rule [Parent e p] [Let p e _ _])
(rule [Parent e p] [Let p _ e _])
(rule [Parent e p] [Let p _ _ e])
(rule [Parent e p] [Letrec p e _ _])
(rule [Parent e p] [Letrec p _ e _])
(rule [Parent e p] [Letrec p _ _ e])
(rule [Parent e p] [Lam p e])
(rule [Parent e p] [App p e])
(rule [Parent e p] [Arg e p _])
(rule [Parent e p] [If p e _ _])
(rule [Parent e p] [If p _ e _])
(rule [Parent e p] [If p _ _ e])

(rule [HasParent e] [Parent e _])
(rule [AstRoot e] [Ast e] (not [HasParent e]))


;; state machine

(rule [Reachable [ev e [nil] [nil] 0]] [AstRoot e])
(rule [Reachable ς‘] [Reachable ς] [Step ς ς‘])

(rule [Steps ς] [Step ς _])
(rule [Final ς] [Reachable ς] (not [Steps ς]))
(rule [Result d] [Final [ko d [nil] 0]])

;(rule [Eval e d] )

; transition relation

(rule [Step [ev e ρ ι κ] 
            [ko d ι κ]]
      [Reachable [ev e ρ ι κ]] [Lit e d])

(rule [Step [ev e ρ ι κ]
            [ev e-init ρ [cons [letk x e-body ρ] ι] κ]]
      [Reachable [ev e ρ ι κ]] [Let e x e-init e-body])

(rule [Step [ev e ρ ι κ]
            [ko d ι κ]]
      [Reachable [ev e ρ ι κ]] [Id e x])

(rule [Step [ko d-init [cons [letk x e-body ρ] ι] κ]
            [ev e-body [cons [binding x d-init] ρ] ι κ]]
      [Reachable [ko d-init [cons [letk x e-body ρ] ι] κ]])


  
`;

function param2tuples(p)
{
  return function (param, i)
  {
    if (param instanceof Sym)
    {
      return [['Param', param.tag, param.name, p, i]];
    }
    throw new Error(`cannot handle param ${param}`);
  }
}

function arg2tuples(p)
{
  return function (arg, i)
  {
    const argTuples = ast2tuples(arg);
    return [['Arg', arg.tag, p, i], ...argTuples];
  }
}

function ast2tuples(ast)
{
  if (ast instanceof String)
  {
    return [['Lit', ast.tag, String(ast)]];
  }
  if (ast instanceof Number)
  {
    return [['Lit', ast.tag, Number(ast)]];
  }
  if (ast instanceof Sym)
  {
    return [['Id', ast.tag, String(ast)]];
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
            return [['Lam', ast.tag, body.tag], ...paramTuples, ...bodyTuples];
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
            return [['Let', ast.tag, name.tag, init.tag, body.tag], ...nameTuples, ...initTuples, ...bodyTuples];
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
            return [['Letrec', ast.tag, name.tag, init.tag, body.tag], ...nameTuples, ...initTuples, ...bodyTuples];
          }
        case "if":
          {
            const cond = ast.cdr.car;
            const cons = ast.cdr.cdr.car;
            const alt = ast.cdr.cdr.cdr.car;
            const condTuples = ast2tuples(cond);
            const consTuples = ast2tuples(cons);
            const altTuples = ast2tuples(alt);
            return [['If', ast.tag, cond.tag, cons.tag, alt.tag], ...condTuples, consTuples, altTuples];
          }
        default:
          {
            const argTuples = [...ast.cdr].flatMap(arg2tuples(ast.tag));
            return [['App', ast.tag, car.tag], ...argTuples];
          }
      }
    }
  }
  throw new Error(`cannot handle expression ${ast}`);
}

const ast = new SchemeParser().parse(schemeProgram);
const edbTuples = ast2tuples(ast.car);
console.log(edbTuples.join('\n'));

const ceskparser = new SexpParser();
const cesksexp = ceskparser.parse(ceskspec);
const ceskrsp = sexp2rsp(cesksexp);
const ceskjs = rsp2js(ceskrsp);
const cesk = new Function(ceskjs)();

const tupleMap = new Map();
for (const edbTuple of edbTuples)
{
  MutableMaps.putPushArray(tupleMap, cesk[edbTuple[0]], new cesk[edbTuple[0]](...edbTuple.slice(1)));
}
const ceskTuples = new Map(cesk.addTupleMap(tupleMap).added());
console.log([...cesk.tuples()].join('\n'));

console.log(`\n\n==== final:`);
const finalTuples = ceskTuples.get(cesk.Final);
console.log(finalTuples.map(t => t.t0).join('\n'));

console.log(`\n\n==== result:`);
const resultTuples = ceskTuples.get(cesk.Result);
console.log(resultTuples.map(t => t.t0).join('\n'));

