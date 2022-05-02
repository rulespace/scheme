import { Null, Pair, SchemeParser, Sym } from './sexp-reader.js';

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
          const paramTuples = [...params].map(ast2tuples);
          const body = ast.cdr.cdr.car; // only one body exp allowed (here, and elsewhere)
          const bodyTuples = ast2tuples(body);
          return [['$lam', ast.tag, ...[...params].map(t => t.tag), body.tag], ...paramTuples.flat(), ...bodyTuples];
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
          const argTuples = [...ast.cdr].map(ast2tuples);
          return [['$app', ast.tag, car.tag, ...[...ast.cdr].map(t => t.tag)], ...ratorTuples, ...argTuples.flat()];
        }
      }
    }
    else // not a special form
    { // TODO: cloned from default (`app`) case above
      const ratorTuples = ast2tuples(car);
      const argTuples = [...ast.cdr].map(ast2tuples);
      return [['$app', ast.tag, car.tag, ...[...ast.cdr].map(t => t.tag)], ...ratorTuples, ...argTuples.flat()];
    }
  }
  throw new Error(`cannot handle expression ${ast} of type ${ast?.constructor?.name}`);
}

function subtreeMatches(t1, n1map, t2, n2map)
{
  if (((t1[0] === '$id' || t1[0] === '$lit')) && t1[0] === t2[0])
  {
    if (t1[2] === t2[2])
    {
      return 1;
    }
    return 0;
  }
  else
  {
    if (t1[0] !== t2[0] || t1.length !== t2.length)
    {
      return 0;
    }
    let intermediateN = 1;
    for (let i = 2; i < t1.length; i++)
    {
      const nn = subtreeMatches(n1map[t1[i]], n1map, n2map[t2[i]], n2map);
      if (nn === 0)
      {
        return 0;
      }
      else
      {
        intermediateN += nn;
      }
    }
    return intermediateN;  
  }
}

function nodeMap(ts)
{
  const m = [];
  for (const t of ts)
  {
    m[t[1]] = t;
  }
  return m;
}

function diff(p1, p2)
{
  const start = performance.now();

  const n1s = ast2tuples(p1);
  const n2s = ast2tuples(p2);

  console.log(`p1 exploded tuples\n${n1s.join('\n')}`);

  const n1map = nodeMap(n1s);
  const n2map = nodeMap(n2s);

  const initial = [[], 0, 0, 0];  // choices i j cost
  const leafs = [];
  const todo = [initial];

  let minCost = 9007199254740991;

  while (todo.length > 0)
  {

    // if (Math.round(performance.now()) % 100 === 0)
    // {
    //   console.log(todo.length);
    // }

    // if (leafs.length > 0)
    // {
    //   leafs.sort((a, b) => a[1] - b[1]);
    //   console.log(`${leafs.length} solutions, current top ${leafs[0].join(' ')}`);  
    // }

    const current = todo.pop();
    const choices = current[0];
    const i = current[1];
    const j = current[2];
    const cost = current[3];

    if (cost > minCost)
    {
      console.log(`minCost ${minCost} killing ${cost}: ${choices.join(' ')}`);
      continue;
    }

    if (i === n1s.length && j === n2s.length)
    {
      leafs.push([choices, cost]);
      minCost = Math.min(minCost, cost);
      continue;
    }

    if (i === n1s.length)
    {
      todo.push([choices.concat([['newR', 1]]), i, j+1, cost + 100]);
      continue;
    }
    
    if (j === n2s.length)
    {
      todo.push([choices.concat([['newL', 1]]), i+1, j, cost + 100]);
      continue;
    }

    const left = n1s[i];
    const right = n2s[j];

    const matches = subtreeMatches(left, n1map, right, n2map);
    if (matches > 0)
    {
      // todo.push([choices.concat([['match', matches]]), i+matches, j+matches]);
      // pushMatch
      const prevChoice = choices.at(-1);
      if (prevChoice !== undefined && prevChoice[0] === 'match')
      {
        const newChoices = choices.slice(0, -1);
        newChoices.push(['match', prevChoice[1] + matches]);
        todo.push([newChoices, i + matches, j + matches, cost]);
      }
      else
      {
        todo.push([choices.concat([['match', matches]]), i+matches, j+matches, cost]);
      }
      //      
    }
    else
    { 
      const prevChoice = choices.at(-1);
      if (prevChoice !== undefined && prevChoice[0] === 'newL')
      {
        const newChoices = choices.slice(0, -1);
        newChoices.push(['newL', prevChoice[1] + 1]);
        todo.push([newChoices, i + 1, j, cost + 100]);
      }
      else
      {
        todo.push([choices.concat([['newL', 1]]), i+1, j, cost + 100]);
      }

      if (prevChoice !== undefined && prevChoice[0] === 'newR')
      {
        const newChoices = choices.slice(0, -1);
        newChoices.push(['newR', prevChoice[1] + 1]);
        todo.push([newChoices, i, j + 1, cost + 100]);
      }
      else
      {
        todo.push([choices.concat([['newR', 1]]), i, j+1, cost + 100]);
      }

      if (left[0] === '$id' && left[0] === right[0] && left[2] !== right[2])
      {
        todo.push([choices.concat([['modify']]), i+1, j+1, cost + 1]);
      }
      else if (left[0] === '$lit' && left[0] === right[0] && left[2] !== right[2])
      {
        todo.push([choices.concat([['modify']]), i+1, j+1, cost + 1]);
      }
      else if (left[0] === right[0])
      {
        if (left[0] === '$let' || left[0] === '$if' || left[0] === '$lam' || left[0] === '$app')
        {
          // pushMatch
          const prevChoice = choices.at(-1);
          if (prevChoice !== undefined && prevChoice[0] === 'match')
          {
            const newChoices = choices.slice(0, -1);
            newChoices.push(['match', prevChoice[1] + 1]);
            todo.push([newChoices, i + 1, j + 1, cost]);
          }
          else
          {
            todo.push([choices.concat([['match', 1]]), i+1, j+1, cost]);
          }
          //
        }
      }
    }
  }

  // function cost(choices)
  // {

  //   function individualCost(choice)
  //   {
  //     switch (choice[0])
  //     {
  //       case 'match': return 0;
  //       case 'modify': return 1;
  //       case 'newL': return Math.round((choice[1] * 100) + Math.sqrt(choice[1] * 100));
  //       case 'newR': return Math.round((choice[1] * 100) + Math.sqrt(choice[1] * 100));
  //       default: throw new Error(`cannot handle choice ${choice[0]}`)
  //     }
  //   }

  //   return choices.reduce((acc, x) => acc += individualCost(x), 0);
  // }

  leafs.sort((a, b) => a[1] - b[1]);
  const duration = performance.now() - start;

  // console.log(leafs.map(e => [e, cost(e)]).slice(0, 100).join('\n'));
  console.log(`solutions ${leafs.length} duration ${duration}`);

  const [topChoices, cost] = leafs[0];
  console.log(`top choices ${topChoices.join(' ')}`);
  
  let i = 0;
  let j = 0;

  const edits = [];
  for (const choice of topChoices)
  {
    switch (choice[0])
    {
      case 'match':
        {
          i += choice[1];
          j += choice[1];
          break;
        }
        case 'modify':
        {
          edits.push(['modify', n1s[i][1], n2s[j][2]]);
          i++;
          j++;
          break;
        }
        case 'newL':
        {
          const length = choice[1];
          edits.push(['remove', n1s.slice(i, i + length)]);
          i += length;
          break;
        }
        case 'newR':
        {
          const length = choice[1];
          edits.push(['add', n1s[i-1], n2s.slice(j, j + length)]); // the -1 makes it an 'add n2s after n1s[i-1]'
          j += length;
          break;
        }
        default:
          throw new Error(`cannot handle choice ${choice[0]}`);
    }
  }
  return edits;
}


export { diff, ast2tuples }

// const parser = new SchemeParser();
// // const p1 = parser.parse(`(let ((f (lambda (x y) (+ x y)))) (f 1 2))`);
// // const p2 = parser.parse(`(let ((f (lambda (x z y) (+ x y)))) (f 1 99 2))`);

// // interesting case: match,2 modify newR,2 match,1 newR,1 (captures intent?) vs. match,2 newR,4 match,1 newL,1
// // const p1 = parser.parse(`(let ((x 1)) x)`);
// // const p2 = parser.parse(`(let ((x 2)) (+ x 1))`);

// const p1 = parser.parse(`(lambda (x) (+ 1 2))`);
// const p2 = parser.parse(`(lambda (x y) z)`);

// console.log(diff(p1.car, p2.car));