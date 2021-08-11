import { specification } from './greval-rsp.js';
import { compileToConstructor, instance2dot } from 'rulespace';
import { SchemeParser, Sym, Pair } from './sexp-reader.js';

const evaluatorCtr = compileToConstructor(specification, {debug:false});

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
  //  console.log(programTuples.join('\n'));

  const evaluator = evaluatorCtr();
  evaluator.addTuples(programTuples.map(t => toModuleTuple(evaluator, t)));

  // console.log([...evaluator.tuples()].join('\n'));
  // console.log(instance2dot(evaluator));

  const astrootTuples = [...evaluator.tuples()].filter(t => t.constructor.name === 'ast_root');
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
          const name = binding.car.car.name;
          const init = binding.car.cdr.car;
          const body = ast.cdr.cdr.car;
          // const nameTuples = ast2tuples(name);
          const initTuples = ast2tuples(init);
          const bodyTuples = ast2tuples(body);
          return [['$let', ast.tag, name, init.tag, body.tag], ...initTuples, ...bodyTuples];
        }
        case "letrec":
        {
          const binding = ast.cdr.car;
          const name = binding.car.car.name;
          const init = binding.car.cdr.car;
          const body = ast.cdr.cdr.car;
          // const nameTuples = ast2tuples(name);
          const initTuples = ast2tuples(init);
          const bodyTuples = ast2tuples(body);
          return [['$letrec', ast.tag, name, init.tag, body.tag], ...initTuples, ...bodyTuples];
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

        case "set!":
        {
          const name = ast.cdr.car.name;
          const update = ast.cdr.cdr.car;
          //  const nameTuples = ast2tuples(name);
          const updateTuples = ast2tuples(update);
          return [['$set', ast.tag, name, update.tag], ...updateTuples];         
        }

        case "set-car!":
        {
          const name = ast.cdr.car;
          const update = ast.cdr.cdr.car;
          const nameTuples = ast2tuples(name);
          const updateTuples = ast2tuples(update);
          return [['$setcar', ast.tag, name.tag, update.tag], ...nameTuples, ...updateTuples];         
        }
        case "set-cdr!":
        {
          const name = ast.cdr.car;
          const update = ast.cdr.cdr.car;
          const nameTuples = ast2tuples(name);
          const updateTuples = ast2tuples(update);
          return [['$setcdr', ast.tag, name.tag, update.tag], ...nameTuples, ...updateTuples];         
        }


        default: // app
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
  throw new Error(`cannot handle expression ${ast} of type ${ast.constructor.name}`);
}


console.log(greval(`
(let ((x 10)) (let ((y 20)) y))
`));
