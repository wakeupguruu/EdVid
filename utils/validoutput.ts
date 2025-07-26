export function cleanAndParseLLMOutput(raw: string): any | null {
  try {
    // Step 1: Parse the outer object
    const outer = JSON.parse(raw);

    // Step 2: Get the inner "output" string
    let innerString = outer.output;

    // Step 3: Parse the inner JSON string (which is escaped)
    const innerParsed = JSON.parse(innerString);

    return innerParsed;
  } catch (err) {
    console.error('❌ Error parsing output:', err);
    return null;
  }
}
