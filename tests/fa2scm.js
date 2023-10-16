const inputFileName = Deno.args[0];
let outputFileName = Deno.args[1];

const input = Deno.readTextFileSync(inputFileName);
const letters = input.split('\n');
while (letters[0].startsWith(';') || letters[0] === '')
{
  letters.shift();
}

outputFileName = outputFileName || inputFileName + '.scm';

Deno.writeTextFileSync(outputFileName, `(${Array.from(letters.join('')).join(' ')})`);
