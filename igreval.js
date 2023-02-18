// import * as evaluator from './compiled/agreval_module.mjs';
import { assertTrue, 
  compileToConstructor, compileToModuleSrc, instance2dot, computeMeta } from './deps.ts';
import { Sym, Pair } from './sexp-reader.js';
import { specification } from './agreval-rsp.js';

// import * as module from './compiled/agreval_module.mjs';


export { lattice_conc, lattice_prim } from './lattice-rsp.js';
export { kalloc_conc, kalloc_0cfa } from './kalloc-rsp.js';
export { specification as semantics_scheme };
export { computeMeta };

export { instance2dot };

function param2tuples(lam)
{
  return function (param, i)
  {
    if (param instanceof Sym)
    {
      const paramTuples = ast2tuples(param);
      return [['param', param.tag, lam, i], ...paramTuples]; 
    }
    throw new Error(`cannot handle param ${param}`);
  }
}

function rand2tuples(app)
{
  return function (arg, i)
  {
    const randTuples = ast2tuples(arg);
    return [['rand', arg.tag, app, i], ...randTuples];
  }
}

export function ast2tuples(ast)
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

        case "set!":
        {
          const name = ast.cdr.car;
          const update = ast.cdr.cdr.car;
          const nameTuples = ast2tuples(name);
          const updateTuples = ast2tuples(update);
          return [['$set', ast.tag, name.tag, update.tag], ...nameTuples,  ...updateTuples];         
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
          const argTuples = [...ast.cdr].flatMap(rand2tuples(ast.tag));
          return [['$app', ast.tag, car.tag], ...ratorTuples, ...argTuples];
        }
      }
    }
    else // not a special form
    { // TODO: cloned from default (`app`) case above
      const ratorTuples = ast2tuples(car);
      const argTuples = [...ast.cdr].flatMap(rand2tuples(ast.tag));
      return [['$app', ast.tag, car.tag], ...ratorTuples, ...argTuples];
    }
  }
  throw new Error(`cannot handle expression ${ast} of type ${ast?.constructor?.name}`);
}


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

function toGenericTuple(moduleTuple)
{
  return [moduleTuple.constructor.name, ...moduleTuple.values()];
}

//@ deprecated
function getTuples2(evaluator, pred)
{
  return [...evaluator.tuples()].filter(t => t.constructor.name === pred);
}

function* filterPred(tuples, pred)
{
  for (const t of tuples)
  {
    if (t.constructor.name === pred)
    {
      yield t;
    }
  }
}

export function create_igreval(configSrc)
{
  const evaluatorCtr = compileToConstructor(specification + configSrc);//, {debug:true, assertions:true});
 
  return function(ast, options = {}) // initial evaluation
  {
    const evaluator = evaluatorCtr();
    // const evaluator = module;
    // // this is badly named, since there's also a 'debug' flag on the rsp compiler
    // const FLAG_debug = options.debug ?? false;

    
    // const ast = new SchemeParser().parse(src);
    const programTuples = ast2tuples(ast); 
    // console.log(programTuples.join('\n'));
    // console.log(programTuples.map(t => `\\rel{${t[0].substring(1)}}(${t.slice(1).join()})`).join(',\n'));

    // const startInitialEvaluation = performance.now();
    evaluator.addTuples(programTuples.map(t => toModuleTuple(evaluator, t)));
    // const durationInitialEvaluation = performance.now() - startInitialEvaluation;
    // console.log(`initial evaluation ${durationInitialEvaluation}`);

    return new Evaluator(evaluator);
  }
}

class Evaluator
{
  constructor(evaluator)
  {

    // BEGIN checks and stuff
    const astrootTuples = getTuples2(evaluator, 'ast_root');
    if (astrootTuples.length !== 1)
    {
      console.log("program:");
      console.log(evaluator._ast.toString());
      console.log("\nevaluator tuples:")
      console.log([...evaluator.tuples()].join('\n'));
      throw new Error(`wrong number of 'astroot' tuples: ${astrootTuples.length}`);
    }

    // if (FLAG_debug)
    // {
    //   debug(evaluator);
    // }
    // END checks and stuff
    
    this.evaluator = evaluator;
  }

  //
  
  tuples()
  {
    return this.evaluator.tuples();
  }
  
  //

  computeFlowGraph()
  {
    const evaluator = this.evaluator;
    const todo = [this.initialState()];
    const states = new Set();
    const transitions = [];
    while (todo.length > 0)
    {
      const current = todo.pop();
      if (states.has(current))
      {
        continue;
      }
      states.add(current);
      for (const succ of this.successorStates(current))
      {
        transitions.push([current, succ]);
        todo.push(succ);
      }
    }
    return {states:[...states], transitions};
  }

  result()
  {
    const evaluator = this.evaluator;
    const result = [];
    for (const t of filterPred(evaluator.tuples(), 'evaluate'))
    {
     result.push(t.t1);
    }
    return result;
  }

  initialState()
  {
    const evaluator = this.evaluator;
    return [...filterPred(evaluator.tuples(), 'initial_state')][0].t0;
  }
  
  successorStates(state)
  {
    const evaluator = this.evaluator;
    const result = [];
    for (const t of filterPred(evaluator.tuples(), 'step'))
    {
      if (t.t0 === state)
      {
        result.push(t.t1);
      }
    }
    return result;  
  }

  rootTag()
  {
    const evaluator = this.evaluator;
    const result = [...filterPred(evaluator.tuples(), 'ast_root')];
    if (result.length === 0)
    {
      throw new Error('no roots');
    }
    if (result.length > 1)
    {
      throw new Error('multiple roots');
    }
    return result[0].t0;  
  }

  parentTag(childTag)
  {
    const evaluator = this.evaluator;
    for (const t of filterPred(evaluator.tuples(), 'parent'))
    {
      if (t.t0 === childTag)
      {
        return t.t1;
      }
    }
    return null;
  }

  isAstTuple(moduleTuple)
  {
    const name = moduleTuple.name();
    return name.startsWith('$') || name === 'param' || name === 'rand';
  }
  
  astTuple(tag)
  {
    const evaluator = this.evaluator;
    for (const t of evaluator.tuples())
    {
      if (this.isAstTuple(t))
      {
        if (t.t0 === tag)
        {
          return t;
        }
      }
    }
    throw new Error(`tuple with tag ${tag} not found`);
  }
     
  expToString(tag)
  {
    const evaluator = this.evaluator;
    const self = this;
    function helper(tag)
    {
      const t = self.astTuple(tag);
      switch (t.constructor.name)
      {
        case '$id': return t.t1;
        case '$lit': return t.t1;
        case '$let': return `(let ((${helper(t.t1)} ${helper(t.t2)})) ${helper(t.t3)})`;
        case '$letrec': return `(letrec ((${helper(t.t1)} ${helper(t.t2)})) ${helper(t.t3)})`;
        case '$lam': 
        {
          const lamTag = t.values()[0];
          const params = evaluator.tuples().filter(t => t.name() === 'param' && t.values()[1] === lamTag);
          params.sort((x, y) => x.values()[2] - y.values()[2]);
          const paramTags = params.map(t => t.t0);
          return `(lambda (${paramTags.map(helper).join(' ')}) ${helper(t.t1)})`;
        }
        case '$if': return `(if ${helper(t.t1)} ${helper(t.t2)} ${helper(t.t3)})`;
        case '$set': return `(set! ${helper(t.t1)} ${helper(t.t2)})`;
        case '$cons': return `(cons ${helper(t.t1)} ${helper(t.t2)})`;
        case '$car': return `(car ${helper(t.t1)})`;
        case '$cdr': return `(cdr ${helper(t.t1)})`;
        case '$setcar': return `(set-car! ${helper(t.t1)} ${helper(t.t2)})`;
        case '$setcdr': return `(set-cdr! ${helper(t.t1)} ${helper(t.t2)})`;
        case '$app':
          {
            const appTag = t.values()[0];
            const rands = evaluator.tuples().filter(t => t.name() === 'rand' && t.values()[1] === appTag);
            rands.sort((ta, tb) => ta.t2 - tb.t2);
            const randTags = rands.map(t => t.t0);
            return `(${helper(t.t1)} ${randTags.map(helper).join(' ')})`;
          }
        default: throw new Error(t.constructor.name);
      }
    }
  
    return helper(tag);
  }

  print(result)
  {
    if (typeof result === 'object')
    {
      switch (result.name())
      {
        case 'obj':
          {
            const tag = result.values()[0];
            return this.expToString(tag); 
          }
        default:
          throw new Error(`cannot handle tuple ${result}`);
      }
    }
    return String(result);
  }

  valueOf(tag, state)
  {
    const evaluator = this.evaluator;
    const result = [];
    for (const t of filterPred(evaluator.tuples(), 'greval'))
    {
      if (t.t0 === tag && t.t1 === state)
      {
        result.push(t.t2);
      }
    }
    return result;
  }

  meta()
  {
    return computeMeta(this.evaluator);
  }

  deltaEvaluate(delta) // incremental evaluation
  {
    
    // const startDeltaEvaluation = performance.now();
    const tuples = this.tuples().filter(this.isAstTuple);

    // console.log('module ast tuples');
    // for (const t of tuples)
    // {
    //   console.log(`${t}`);
    // }

    const tupleMap1 = toMtTupleMap(tuples);

    console.log('tuple map 1');
    for (const [k, v] of tupleMap1)
    {
      console.log(`${k} -> ${v}`);
    }

    const addTuples = [];
    const removeTuples = [];

    const evaluator = this.evaluator;


    function insertParam(lamTag, currentParams, insertPosition, paramAst)
    {
      // insert new param tuple
      addTuples.push(toModuleTuple(evaluator, paramAst));
      addTuples.push(toModuleTuple(evaluator, ['param', paramAst[1], lamTag, insertPosition]));
      // remove all params at and after insertion point
      // shift param tuples at and after insertion point
      for (let i = insertPosition; i < currentParams.length; i++)
      {
        removeTuples.push(currentParams[i]);
        addTuples.push(toModuleTuple(evaluator, ['param', currentParams[i].values()[0], currentParams[i].values()[1], currentParams[i].values()[2] + 1]));
      }
    }

    function insertRand(appTag, currentRands, insertPosition, randAst) // cloned from insertParam
    {
      // insert new rand tuple
      addTuples.push(toModuleTuple(evaluator, randAst));
      addTuples.push(toModuleTuple(evaluator, ['rand', randAst[1], appTag, insertPosition]));
      // remove all rands at and after insertion point
      // shift rand tuples at and after insertion point
      for (let i = insertPosition; i < currentRands.length; i++)
      {
        removeTuples.push(currentRands[i]);
        addTuples.push(toModuleTuple(evaluator, ['rand', currentRands[i].values()[0], currentRands[i].values()[1], currentRands[i].values()[2] + 1]));
      }
    }

    for (const d of delta)
    {
      switch (d[0])
      {
        case 'modify': // tag, newValue
        {
          const mt = tupleMap1.get(d[1]);
          assertTrue(mt.name() === '$id' || mt.name() === '$lit');
          removeTuples.push(mt);
          addTuples.push(toModuleTuple(this.evaluator, [mt.name(), mt.values()[0], d[2]]));
          break;
        }
        case 'add': // before tag, ...new ast
        {
          // const newMts = d.slice(2).map(t => toModuleTuple(this.evaluator, [t[0], ...t.slice(1)]));

          const beforeMt = tupleMap1.get(d[1][1]);
          switch (beforeMt.name())
          {
            case '$id':
            case '$lit':
            {
              const parentTag = this.parentTag(d[1][1]);
              const parentMTuple = this.astTuple(parentTag);  
              switch (parentMTuple.name())
              {
                case '$lam':  // TODO: assert beforeMt cannot be $lit
                {
                  // inserting or appending param (not pos 0)
                  const beforeTag = d[1][1]; 
                  const currentParams = tuples.filter(mt => mt.name() === 'param' && mt.values()[1] === parentTag);
                  currentParams.sort((x, y) => x.values()[2] - y.values()[2]);
                  let currentPosition;
                  for (currentPosition = 0; currentPosition < currentParams.length; currentPosition++)
                  {
                    if (currentParams[currentPosition].values()[0] === beforeTag)
                    {
                      break;
                    }
                  }
                  const insertPosition = currentPosition + 1;
                  insertParam(parentTag, currentParams, insertPosition, d[2]);
                  break;
                }
                case '$app':
                {
                  // inserting or appending rand (can be pos 0 if inserting at `(f * <op> <op>)` )
                  const beforeTag = d[1][1]; 
                  const operatorTag = parentMTuple.values()[1];
                  if (beforeTag === operatorTag) // inserting rand at pos 0
                  {
                    const currentRands = tuples.filter(mt => mt.name() === 'rand' && mt.values()[1] === parentTag);
                    insertRand(parentTag, currentRands, 0, d[2]);      
                  }
                  else // for 'pos 0', could also scan rands and if not found then pos 0
                  {
                    const currentRands = tuples.filter(mt => mt.name() === 'rand' && mt.values()[1] === parentTag);
                    currentRands.sort((x, y) => x.values()[2] - y.values()[2]);
                    let currentPosition;
                    for (currentPosition = 0; currentPosition < currentRands.length; currentPosition++)
                    {
                      if (currentRands[currentPosition].values()[0] === beforeTag)
                      {
                        break;
                      }
                    }
                    const insertPosition = currentPosition + 1;
                    insertRand(parentTag, currentRands, insertPosition, d[2]);  
                  }
                  break;
                }
                default: throw new Error(`cannot handle parent ${parentMTuple} for delta ${d}`);
              }
              break;
            }
            case '$lam': 
            {
              // prepending param (pos 0)
              const lamTag = d[1][1];
              const currentParams = tuples.filter(mt => mt.name() === 'param' && mt.values()[1] === lamTag);
              insertParam(lamTag, currentParams, 0, d[2]);
              break;
            }
            default: throw new Error(`cannot handle add after tuple ${beforeMt} in ${d}`);
          }
          break;
        }
        default: throw new Error(`cannot handle delta operation ${d}`);
      }
    }
    
    console.log(`add ${addTuples.join(' ')}`);
    console.log(`rem ${removeTuples.join(' ')}`);


    this.evaluator.addTuples(addTuples);
    this.evaluator.removeTuples(removeTuples);
    // const durationDeltaEvaluation = performance.now() - startDeltaEvaluation;
    // console.log(`delta evaluation ${durationDeltaEvaluation}`);
    return new Evaluator(this.evaluator);
  }
}

function toMtTupleMap(mtuples)
{
  const tupleMap = new Map();
  for (const mt of mtuples)
  {
    const t = toGenericTuple(mt);
    if (t[0].startsWith('$'))
    {
      tupleMap.set(t[1], mt); // module tuple!
    }
    else if (t[0] === 'param' || t[0] === 'rand')
    {
      tupleMap.set(`${t[2]}-${t[3]}`, mt); // module tuple!
    }
    else
    {
      throw new Error(`cannot handle tuple ${t}`);
    }
  }
  return tupleMap;
}

