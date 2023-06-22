import { assertTrue } from './deps.ts';
import { Null, Pair, SchemeParser, Sym } from './sexp-reader.js';

export { diff, diffAst, ast2tuples, nodeMap }

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
          const paramTuples = [...params].map(sym => ['$param', sym.tag, sym.toString()]);
          const body = ast.cdr.cdr.car; // only one body exp allowed (here, and elsewhere)
          const bodyTuples = ast2tuples(body);
          return [['$lam', ast.tag, ...[...params].map(t => t.tag), body.tag], ...paramTuples, ...bodyTuples];
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
  if (((t1[0] === '$id' || t1[0] === '$lit' || t1[0] === '$param')) && t1[0] === t2[0])
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

function diffAst(p1, p2)
{
  const n1s = ast2tuples(p1);
  const n2s = ast2tuples(p2);

  console.log(`p1 exploded tuples\n${n1s.join('\n')}`);

  return diff(n1s, n2s);
}

function step1(n1s, n1map, n2s, n2map)
{
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

    const [choices, i, j, cost] = todo.pop();

    if (cost > minCost)
    {
      // console.log(`minCost ${minCost} killing ${cost}: ${choices.join(' ')}`);
      continue;
    }

    if (i === n1s.length && j === n2s.length)
    {
      leafs.push([choices, cost]);
      minCost = Math.min(minCost, cost); // TODO: check: actually minCost = cost (because of earlier test)
      continue;
    }

    // make trailing R and L bit more expensive (same-cost solution that ends with Ms is better)?

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
      // // pushMatch
      // const prevChoice = choices.at(-1);
      // if (prevChoice !== undefined && prevChoice[0] === 'match')
      // {
      //   const newChoices = choices.slice(0, -1);
      //   newChoices.push(['match', prevChoice[1] + matches]);
      //   todo.push([newChoices, i + matches, j + matches, cost]);
      // }
      // else
      {
        todo.push([choices.concat([['match', matches]]), i+matches, j+matches, cost]);
      }
      //      
    }
    // else   // SHOULD THIS ELSE BE HERE OR NOT?  e.g. (f *a b) -> (f *a a b) should not be M by default (can also be R)
    { 
      // const prevChoice = choices.at(-1);

      // if (prevChoice !== undefined && prevChoice[0] === 'newL')
      // {
      //   const newChoices = choices.slice(0, -1);
      //   newChoices.push(['newL', prevChoice[1] + 1]);
      //   todo.push([newChoices, i + 1, j, cost + 100]);
      // }
      // else
      {
        todo.push([choices.concat([['newL', 1]]), i+1, j, cost + 100]);
      }

      // if (prevChoice !== undefined && prevChoice[0] === 'newR')
      // {
      //   const newChoices = choices.slice(0, -1);
      //   newChoices.push(['newR', prevChoice[1] + 1]);
      //   todo.push([newChoices, i, j + 1, cost + 100]);
      // }
      // else
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
          // const prevChoice = choices.at(-1);
          // if (prevChoice !== undefined && prevChoice[0] === 'match')
          // {
          //   const newChoices = choices.slice(0, -1);
          //   newChoices.push(['match', prevChoice[1] + 1]);
          //   todo.push([newChoices, i + 1, j + 1, cost]);
          // }
          // else
          {
            todo.push([choices.concat([['match', 1]]), i+1, j+1, cost]);
          }
          //
        }
      }
    }
  }

  leafs.sort((a, b) => a[1] - b[1]); // TODO: dynamically track shortest instead of post-sort
  // console.log(leafs.slice(0, 100).join('\n'));

  console.log(`solutions ${leafs.length}`);  
  const [topChoices, cost] = leafs[0];
  console.log(`top choices (cost ${cost}):\n${topChoices.join('\n')}`);  
  return topChoices;
}

function diff(n1s, n2s)
{
  const start = performance.now();
  
  const n1map = nodeMap(n1s);
  const n2map = nodeMap(n2s);

  const topChoices = step1(n1s, n1map, n2s, n2map);
  console.log(`duration step 1 ${performance.now() - start}`);

  let c = 0;
  let i = 0;
  let j = 0;

  const edits = [];

  function consumeChoice()
  {
    return topChoices[c++];
  }

  function modify(tag, pos, val)
  {
    const edit = ['modify', tag, pos, val]
    console.log(`\t\t${edit}`);
    edits.push(edit);
  }

  function add(el)
  {
    const edit = ['add', el] 
    console.log(`\t\t${edit}`);
    edits.push(edit);
  }

  function remove(el)
  {
    const edit = ['remove', el] 
    console.log(`\t\t${edit}`);
    edits.push(edit);
  }

  function genericEdit(edit)
  {
    console.log(`\t\t${edit}`);
    edits.push(edit);
  }

  function matchNonSimple(current, s)
  {
    const ss = s + 1;

    while (s < ss)
    {
      const choice = consumeChoice();
      console.log(`${i} ${n1s[i]} ${choice[0]} ${j} ${n2s[j]}`);
      console.log(`\tmatchNonSimple ${current} ${s}`);
      switch (choice[0])
      {
        case 'match':
        {
          if (current[s+2] !== n1s[i][1])
          {
            modify(current[1], s, n1s[i][1]); // modify tag
          }
          matchPush();
          s++;
          break;
        }
        case 'modify':
        {
          if (current[s+2] !== n1s[i][1])
          {
            modify(current[1], s, n1s[i][1]); // modify tag
          }          
          modify(n1s[i++][1], 0, n2s[j++][2]);  // modify val
          s++;
          break;
        }
        case 'newL':
        {
          // genericEdit(['removeNonSimple', current[1], s]);
          remove(n1s[i++]);
          break;
        }
        case 'newR':
        {
          modify(current[1], s, n2s[j][1]); //
          newRPush();
          s++;
          break;
        }
        default: throw new Error();
      }
    }
  }

  function matchSimple(current, s)
  {
    const choice = consumeChoice();
    switch (choice[0])
    {
      case 'match':
      {
        if (current[s+2] !== n1s[i][1])
        {
          modify(current[1], s, n1s[i][1]); // modify tag
        }
        i++;
        j++;
        break;
      }
      case 'modify':
      {
        if (current[s+2] !== n1s[i][1])
        {
          modify(current[1], s, n1s[i][1]); // modify tag
        }          
        modify(n1s[i++][1], 0, n2s[j++][2]);  // modify val
        break;
      }
      case 'newL':
      {
        remove(n1s[i++]);
        break;
      }
      case 'newR':
      {
        modify(current[1], s, n2s[j][1]); 
        add(n2s[j++]);
        break;
      }
      default: throw new Error();
    }
  }

  function matchSimpleList(current, s, numLeft, numRight)
  {
    const ii = i + numLeft; // we can do this, since all subexps are simple
    const jj = j + numRight;
    let ss = s; // virtual cursor (s is regular cursor in current)

    while (i < ii  || j < jj)
    {
      const choice = consumeChoice();
      console.log(`${i} ${n1s[i]} ${choice[0]} ${j} ${n2s[j]}`);
      console.log(`\tmatchSimpleList ${current} ${s}`);

      switch (choice[0])
      {
        case 'match': // this fails when left is at end (i === ii) and right is not (should become insert)
        // but: can this happen? (with dedicated $param element match can only happen between params, not param and id in body)
        {
          i++;
          j++;
          s++;
          ss++;
          break;
        }
        case 'modify':
        {
          modify(n1s[i][1], 0, n2s[j][2]);  // modify val
          i++;
          j++;
          s++;
          ss++;
          break;
        }
        case 'newL':
        {
          genericEdit(['removeSimple', current[1], ss]);
          remove(n1s[i]);
          i++;
          s++;
          break;
        }
        case 'newR':
        {
          genericEdit(['insertSimple', current[1], ss, n2s[j][1]]);
          add(n2s[j]);
          j++;
          ss++;
          break;
        }
        default: throw new Error();
      }
    }
  }

  function matchLet(current, right)
  {
    matchSimple(current, 0);
    matchNonSimple(current, 1);
    matchNonSimple(current, 2);
  }

  function matchIf(current, right)
  {
    matchSimple(current, 0);
    matchNonSimple(current, 1);
    matchNonSimple(current, 2);
  }

  function matchLam(current, right)
  {
    // params
    const paramsLeft = current.length - 3; // -type, -tag, -body 
    const paramsRight = right.length - 3; 
    const startPosition = 0;
    
    matchSimpleList(current, startPosition, paramsLeft, paramsRight);

    // body
    matchNonSimple(current, paramsLeft);
  }

  function matchApp(current, right)
  {
    // operator
    matchSimple(current, 0);

    // operands
    const operandsLeft = current.length - 3; // -type, -tag, -rator 
    const operandsRight = right.length - 3; 
    const startPosition = 1;

    matchSimpleList(current, startPosition, operandsLeft, operandsRight);
  }

  function newRFixed(current, left)
  {
    for (let s = 0; s < current.length - 2; s++)
    {
      const choice = consumeChoice();
      console.log(`${i} ${n1s[i]} ${choice[0]} ${j} ${n2s[j]}`);
      console.log(`\tnewRFixed ${current} ${s} ${left}`)
      switch (choice[0])
      {
        case 'match':
        {
          current[s+2] = n1s[i][1];
          matchPush();
          break;
        }
        case 'modify':
        {
          current[s+2] = n1s[i][1];
          modify(n1s[i++][1], 0, n2s[j++][2]); // modify val
          break;
        }
        case 'newL':
        {
          remove(n1s[i++]);
          break;
        }
        case 'newR':
        {
          newRPush();
          break;
        }
        default: throw new Error();
     }
    }
    add(current);        
  }

  function matchPush()
  {
    switch (n1s[i][0])
    {
      case '$lit':
      case '$id':
      {
        i++;
        j++;
        break;
      }
      case '$let':
      {
        matchLet(n1s[i++].slice(0), n2s[j++]);
        break;
      }
      case '$if':
      {
        matchIf(n1s[i++].slice(0), n2s[j++]);
        break;
      }
      case '$lam':
      {
        matchLam(n1s[i++].slice(0), n2s[j++]);
        break;
      }
      case '$app':
      {
        matchApp(n1s[i++].slice(0), n2s[j++]);
        break;
      }
      default:
        throw new Error(`cannot handle match ${n1s[i][0]}`);
    }
  }

  function newRPush()
  {
    switch (n2s[j][0])
    {
      case '$lit':
      case '$id':
      {
        add(n2s[j++]);
        break;
      }
      case '$let':
      case '$if':
      case '$lam':
      case '$app':
      {
        newRFixed(n2s[j++].slice(0), n1s[i]);
        break;
      }
      default:
        throw new Error(`cannot handle newR ${n2s[j][0]}`);
    }
  }

  while (c < topChoices.length)
  {
    const choice = consumeChoice();
    console.log(`${i} ${n1s[i]} ${choice[0]} ${j} ${n2s[j]}`);

    if (choice[0] === 'match')
    {
      matchPush();
    }
    else if (choice[0] === 'modify')
    {
      modify(n1s[i++][1], 0, n2s[j++][2]);
    }
    else if (choice[0] === 'newL')
    {
      remove(n1s[i++]);
    }
    else if (choice[0] === 'newR')
    {
      newRPush();
    }
    else
    {
      throw new Error(`cannot handle ${choice[0]} with empty stack`);
    }
  }

  console.log(`\nedits:\n${edits.join('\n')}`);

////////////////////////////////
  // turn modify etc. into add/remove 

  const modifs = [];
  const edits2 = [];
  for (const edit of edits)
  {
    if (edit[0] === 'modify')
    {
      const [_, tag, pos, newTag] = edit;
      if (modifs[tag] === undefined)
      {
        modifs[tag] = n1map[tag].slice(0);
      }
      modifs[tag][pos + 2] = newTag;
    }
    else if (edit[0] === 'insertSimple')
    {
      const [_, tag, pos, newTag] = edit;
      if (modifs[tag] === undefined)
      {
        modifs[tag] = n1map[tag].slice(0);
      }
      modifs[tag].splice(pos + 2, 0, newTag);
    }
    else if (edit[0] === 'removeSimple' || edit[0] === 'removeNonSimple')
    {
      const [_, tag, pos] = edit;
      if (modifs[tag] === undefined)
      {
        modifs[tag] = n1map[tag].slice(0);
      }
      modifs[tag].splice([pos + 2], 1);
    }
    else
    {
      edits2.push(edit);
    }
  }
  for (const modif of modifs)
  {
    if (modif)
    {
      edits2.push(['replace', n1map[modif[1]], modif]); 
    }
  }

  console.log(`\nedits2:\n${edits2.join('\n')}`);

  console.log(`total time ${performance.now() - start}`);
  return edits2;
}

// function modify2addremove(n1s, edits)
// {
// }

// const parser = new SchemeParser();
// // const p1 = parser.parse(`(let ((f (lambda (x y) (+ x y)))) (f 1 2))`);
// // const p2 = parser.parse(`(let ((f (lambda (x z y) (+ x y)))) (f 1 99 2))`);

// interesting case: match,2 modify newR,2 match,1 newR,1 (captures intent?) vs. match,2 newR,4 match,1 newL,1
// const p1 = parser.parse(`(let ((x 1)) x)`);
// const p2 = parser.parse(`(let ((x 2)) (+ x 1))`);

// const p1 = parser.parse(`(lambda (x) (+ 1 2))`);
// const p2 = parser.parse(`(lambda (x y) z)`);

// console.log(diff(p1.car, p2.car));