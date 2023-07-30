import { assertTrue } from './deps.ts';
import { Null, Pair, SchemeParser, Sym } from './sexp-reader.js';

export { diff, diffAst, ast2tuples, nodeMap }

// TODO: quote is handled as an application

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
  if (ast instanceof Null)
  {
    return [['$lit', ast.tag, new Null().valueOf()]]; // TODO: improve
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
        // case "cons":
        // {
        //   const car = ast.cdr.car;
        //   const cdr = ast.cdr.cdr.car;
        //   const carTuples = ast2tuples(car);
        //   const cdrTuples = ast2tuples(cdr);
        //   return [['$cons', ast.tag, car.tag, cdr.tag], ...carTuples, ...cdrTuples];
        // }
        // case "car":
        // {
        //   const pair = ast.cdr.car;
        //   const pairTuples = ast2tuples(pair);
        //   return [['$car', ast.tag, pair.tag], ...pairTuples];
        // }
        // case "cdr":
        // {
        //   const pair = ast.cdr.car;
        //   const pairTuples = ast2tuples(pair);
        //   return [['$cdr', ast.tag, pair.tag], ...pairTuples];
        // }
        case "set!":
        {
          const name = ast.cdr.car;
          const update = ast.cdr.cdr.car;
          const nameTuples = ast2tuples(name);
          const updateTuples = ast2tuples(update);
          return [['$set', ast.tag, name.tag, update.tag], ...nameTuples,  ...updateTuples];         
        }
        // case "set-car!":
        // {
        //   const name = ast.cdr.car;
        //   const update = ast.cdr.cdr.car;
        //   const nameTuples = ast2tuples(name);
        //   const updateTuples = ast2tuples(update);
        //   return [['$setcar', ast.tag, name.tag, update.tag], ...nameTuples, ...updateTuples];         
        // }
        // case "set-cdr!":
        // {
        //   const name = ast.cdr.car;
        //   const update = ast.cdr.cdr.car;
        //   const nameTuples = ast2tuples(name);
        //   const updateTuples = ast2tuples(update);
        //   return [['$setcdr', ast.tag, name.tag, update.tag], ...nameTuples, ...updateTuples];         
        // }

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
  if (((t1[0] === '$id' || t1[0] === '$param' || t1[0] === '$lit')) && t1[0] === t2[0])
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

  let minCost = 9007199254740991; // of solution

  function push(choice)
  {
    const cost = choice[3];
    if (todo.length > 0 && cost >= todo.at(-1)[3])
    {
      todo.unshift(choice);
    }
    else
    {
      todo.push(choice);
    }
  }

  while (todo.length > 0)
  {

    // if (leafs.length > 0) // DEBUG
    // {
    //   leafs.sort((a, b) => a[1] - b[1]);
    //   console.log(`${leafs.length} solutions, current top ${leafs[0].join(' ')}`);  
    // }

    const [choices, i, j, cost] = todo.pop();
    
    if (cost >= minCost) // IMPORTANT
    {
      // console.log(`minCost ${minCost} killing ${cost}`);
      continue;
    }

    if (i === n1s.length && j === n2s.length)
    {
      console.log(`solution ${cost} (todo ${todo.length})`);
      // console.log(choices);
      leafs.push([choices, cost]);
      minCost = Math.min(minCost, cost); // TODO: check: actually minCost = cost (because of earlier test)
      continue;
    }

    if (i === n1s.length)
    {
      push([choices.concat([['newR', 1]]), i, j+1, cost + 100]);
      continue;
    }
    
    if (j === n2s.length)
    {
      push([choices.concat([['newL', 1]]), i+1, j, cost + 100]);
      continue;
    }

    if (Math.round(performance.now()) % 1000 === 0) // DEBUG
    {
      // todo.sort((a, b) => a[1] - b[1]); // b-a => high to low
      // todo.splice(0, todo.length % 2);
      console.log(i, n1s.length, j, n2s.length, todo.length, cost, minCost);    
      // console.log(`cheapest i ${todo.at(-1)[1]} j ${todo.at(-1)[2]} cost ${todo.at(-1)[3]}`);
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
        push([choices.concat([['match', matches]]), i+matches, j+matches, cost]);
      }
      //
    }
    else
    {
      // SHOULD THIS BE EXCLUSIVE (in the 'else' part) WITH MATCH? e.g. (f *a b) -> (f *a a b) should not be M by default (can also be R)
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
          push([choices.concat([['newL', 1]]), i+1, j, cost + 100]);
        }

        // if (prevChoice !== undefined && prevChoice[0] === 'newR')
        // {
        //   const newChoices = choices.slice(0, -1);
        //   newChoices.push(['newR', prevChoice[1] + 1]);
        //   todo.push([newChoices, i, j + 1, cost + 100]);
        // }
        // else
        {
          push([choices.concat([['newR', 1]]), i, j+1, cost + 100]);
        }

        if (left[0] === '$id' && left[0] === right[0] && left[2] !== right[2])
        {
          push([choices.concat([['modify']]), i+1, j+1, cost + 1]);
        }
        else if (left[0] === '$lit' && left[0] === right[0] && left[2] !== right[2])
        {
          push([choices.concat([['modify']]), i+1, j+1, cost + 1]);
        }
        else if (left[0] === '$param' && left[0] === right[0] && left[2] !== right[2])
        {
          push([choices.concat([['modify']]), i+1, j+1, cost + 1]);
        }
        else if (left[0] === right[0])
        {
          if (left[0] === '$let' || left[0] === '$letrec' || left[0] === '$if' || left[0] === '$lam' || left[0] === '$app')
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
              push([choices.concat([['match', 1]]), i+1, j+1, cost]);
            }
            //
          }
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
  const EXP = 0;
  const POS = 1;

  const TYPE = 0;
  const TAG = 1;
  const VAL = 2; // $lit $id

  const start = performance.now();
  
  const n1map = nodeMap(n1s);
  const n2map = nodeMap(n2s);

  const topChoices = step1(n1s, n1map, n2s, n2map);
  console.log(`duration step 1 ${performance.now() - start}`);

  let c = 0;
  let i = 0;
  let j = 0;

  const sl = [];
  const sr = [];
  const sc = [];

  const edits = [];

  function consumeChoice()
  {
    return topChoices[c++];
  }

  function modifyVal(tag, pos, val)
  {
    const edit = ['modifyVal', tag, pos, val];
    console.log(`\t\t${edit}`);
    edits.push(edit);
  }

  function modifyTag(tag, pos, newTag)
  {
    const edit = ['modifyTag', tag, pos, newTag];
    console.log(`\t\t${edit}`);
    edits.push(edit);
  }

  function add(el)
  {
    const edit = ['add', el]; 
    console.log(`\t\t${edit}`);
    edits.push(edit);
  }

  function remove(el)
  {
    const edit = ['remove', el];
    console.log(`\t\t${edit}`);
    edits.push(edit);
  }

  function genericEdit(edit)
  {
    console.log(`\t\t${edit}`);
    edits.push(edit);
  }

  while (c < topChoices.length)
  {
    const choice = consumeChoice();
    console.log(`${n1s[i]} ${choice[0]} ${n2s[j]}`);
    console.log(`\tl ${sl.at(-1)?.join(' ')} r ${sr.at(-1)?.join(' ')} c ${sc.at(-1)?.join(' ')}`);

    if (choice[0] === 'match') // with a match TYPE n1s[i] === n2s[j] always
    {
      if (sc.length > 0)
      {
        const currentPos = sc.at(-1)[POS];
        const comesFromLeft = sl.length > 0 && sc.at(-1)[EXP][TAG] === sl.at(-1)[EXP][TAG];
        if (comesFromLeft)
        {
          // when comesFromLeft then a match means potentially rewriting a tag in an existing element, so we use modify
          const currentPosTag = sc.at(-1)[EXP][currentPos+2];
          // check whether a match is actually necessary
          if (currentPosTag !== n1s[i][TAG])
          {
            modifyTag(sc.at(-1)[EXP][TAG], currentPos, n1s[i][TAG]); // modify pos in left (left===current when comeFromLeft)
          }
        }
        else // comesFromRight
        {
          // when comeFromRight then a match means "prefer left" somewhere in a right el, so we always overwrite
          console.log(`\t\tmatch overwrite ${sc.at(-1)[EXP]} ${currentPos} ${n1s[i][TAG]}`); 
          sc.at(-1)[EXP][currentPos+2] = n1s[i][TAG]; // overwrite pos in current
        }
        sc.at(-1)[POS]++;
        if (sl.length > 0) sl.at(-1)[POS]++; // TODO: move inside comesFromLeft block?
        if (sr.length > 0) sr.at(-1)[POS]++; // TODO: ^ comesFromRight?
      }
      
      if (n1s[i][TYPE] === '$id' || n1s[i][TYPE] === '$lit' || n1s[i][TYPE] === '$param')
      {
        // nothing
      }
      else if (choice[1] > 1) // subexpression match: no push, treat it as atomic match
      {
        // nothing
      }
      else
      {
        sl.push([n1s[i], 0]);
        sr.push([n2s[j], 0]);
        sc.push([n1s[i].slice(0), 0]); // TODO: check: ever mutated? (currently not?: only 'modif' events but not rewriting when current comesFromLef)
      }
      i += choice[1];
      j += choice[1];
    }
    else if (choice[0] === 'modify') // with a modify TYPE n1s[i] === n2s[j] always; 'modify' acts like 'match' wrt. subexp pos
    {
      modifyVal(n1s[i][TAG], 0, n2s[j][VAL]);
      if (sc.length > 0)
      {
        const currentPos = sc.at(-1)[POS];
        const comesFromLeft = sl.length > 0 && sc.at(-1)[EXP][TAG] === sl.at(-1)[EXP][TAG];
        if (comesFromLeft)
        {
          // when comesFromLeft then a modify means potentially rewriting a tag in an existing element, so we use modify
          const currentPosTag = sc.at(-1)[EXP][currentPos+2];
          // check whether a match is actually necessary
          if (currentPosTag !== n1s[i][TAG])
          {
            modifyTag(sc.at(-1)[EXP][TAG], currentPos, n1s[i][TAG]); // modify pos in left (left===current when comeFromLeft)
          }        
        }
        else // comesFromRight
        {
          console.log(`\t\tmodify overwrite ${sc.at(-1)[EXP]} ${currentPos} ${n1s[i][TAG]}`); 
          sc.at(-1)[EXP][currentPos+2] = n1s[i][TAG]; // overwrite pos in current
        }
        if (sl.length > 0) sl.at(-1)[POS]++;
        if (sr.length > 0) sr.at(-1)[POS]++;
        sc.at(-1)[POS]++;  
      }
      i++;
      j++;      
    }
    else if (choice[0] === 'newL') // tactic: don't push subexps (don't increase left pos, delete 'in-place)
    {
      if (sc.length > 0)
      {
        if (sc.at(-1)[EXP][TYPE] === '$lam')
        {
          if (n1s[i][TYPE] === '$param')
          {
            genericEdit(['removeSimple', sl.at(-1)[EXP][TAG], sc.at(-1)[POS]]);
            remove(n1s[i]);
          }
          else // removing body
          {
            remove(n1s[i]);
          }
        }
        else if (sc.at(-1)[EXP][TYPE] === '$app')
        {
          genericEdit(['removeSimple', sl.at(-1)[EXP][TAG], sc.at(-1)[POS]]);
          remove(n1s[i]);
          sl.at(-1)[POS]++; // assuming only lit/id
        }
        else if (sc.at(-1)[EXP][TYPE] === '$let' || sc.at(-1)[EXP][TYPE] === '$if')
        {
          remove(n1s[i]);
        }
        else
        {
          throw new Error(sc.at(-1)[EXP][TYPE]);
        }  
      }
      else
      {
        remove(n1s[i]);
      }
      i++;      
    }
    else if (choice[0] === 'newR')
    {
      if (sc.length > 0)
      {
        const comesFromLeft = sl.length > 0 && sc.at(-1)[EXP][TAG] === sl.at(-1)[EXP][TAG];

        if (comesFromLeft)
        {
          if (sc.at(-1)[EXP][TYPE] === '$lam')
          {
            if (n2s[j][TYPE] === '$param')
            {
              genericEdit(['insertSimple', sc.at(-1)[EXP][TAG], sc.at(-1)[POS], n2s[j][TAG]]);
            }
            else // adding new body
            {
              //(1) removing params
              const numParamsToRemove = sl.at(-1)[EXP].length - sr.at(-1)[EXP].length;
              for (let p = 0; p < numParamsToRemove; p++)
              {
                genericEdit(['removeSimple', sc.at(-1)[EXP][TAG], sc.at(-1)[POS]]);
              }
              modifyTag(sc.at(-1)[EXP][TAG], sc.at(-1)[POS], n2s[j][TAG]);
              //(2) removing (?params and) body ([can be] consequence of inserting params)
              const numXToRemove = sc.at(-1)[POS] - sl.at(-1)[POS];
              for (let q = 0; q < numXToRemove; q++)
              {
                genericEdit(['removeSimple', sc.at(-1)[EXP][TAG], sc.at(-1)[POS] + 1]); // TODO actually not remove'Simple' (body exp can be anything)
              }
            }
          }
          else if (sc.at(-1)[EXP][TYPE] === '$app')
          {
            if (n2s[j][TYPE] === '$id' || n2s[j][TYPE] === '$lit')
            {
              genericEdit(['insertSimple', sc.at(-1)[EXP][TAG], sc.at(-1)[POS], n2s[j][TAG]]);
            }
            else
            {
              throw new Error(`unexpected argument expression type ${n2s[j]}`);
            }
          }
          else if (sc.at(-1)[EXP][TYPE] === '$let' || sc.at(-1)[EXP][TYPE] === '$if')
          {
            modifyTag(sc.at(-1)[EXP][TAG], sc.at(-1)[POS], n2s[j][TAG]);
          }
          else
          {
            throw new Error(sc.at(-1)[EXP][TYPE]);
          }
        }
        else // comesFromRight
        {
          // nothing
        }
      }

      if (sr.length > 0) sr.at(-1)[POS]++;
      if (sc.length > 0) sc.at(-1)[POS]++;
      if (n2s[j][TYPE] === '$id' || n2s[j][TYPE] === '$lit' || n2s[j][TYPE] === '$param')
      {
        add(n2s[j]);
      }
      else
      {
        sr.push([n2s[j], 0]);
        sc.push([n2s[j].slice(0), 0]);
        // adding will happen on pop
      }
      j++;      
    }
    else
    {
      throw new Error(choice[0]);
    }

    while (sc.at(-1))
    {
      const comesFromLeft = sl.length > 0 && sc.at(-1)[EXP][TAG] === sl.at(-1)[EXP][TAG]; // current comes from left: matching mode

      if (comesFromLeft)
      {
        // make sure left and right are exhausted
        if (sl.at(-1)[POS] === sl.at(-1)[EXP].length - 2 && sr.length > 0 && sr.at(-1)[POS] === sr.at(-1)[EXP].length - 2)
        {
          console.log(`match mode (comesFromLeft): popping lrc because lr exhaused`);
          console.log(`\tl ${sl.at(-1)?.join(' ')} r ${sr.at(-1)?.join(' ')} c ${sc.at(-1)?.join(' ')}`);
          sl.pop();
          sr.pop();
          sc.pop();
        }
        else
        {
          break;
        }
      }
      else // comes from right
      {
        // if right exhausted
        if (sr.at(-1)[POS] === sr.at(-1)[EXP].length - 2)
        {
          console.log(`newR mode (comesFromRight): popping rc because r exhaused`);
          console.log(`\tl ${sl.at(-1)?.join(' ')} r ${sr.at(-1)?.join(' ')} c ${sc.at(-1)?.join(' ')}`);
          const topc = sc.pop();
          sr.pop();
          // 'late' add of current that came from right and may have overwritten tags
          add(topc[EXP]);
        }
        else
        {
          break;
        }
      }
    }
  }

  console.log(`\nedits:\n${edits.join('\n')}`);

////////////////////////////////
  // turn modify etc. into add/remove 

  const modifs = [];
  const edits2 = [];
  for (const edit of edits)
  {
    if (edit[0] === 'modifyVal' || edit[0] === 'modifyTag')
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