export function ParseLLMOutput(rawOutput: any){
    
    let outputStr = rawOutput.trim

    //  strip ```json ... ``` or ``` ... ``` if present
    const codeBlockRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/;
  const match = outputStr.match(codeBlockRegex);
  if (match) {
    outputStr = match[1].trim();
  }

  try{
    const parsed = JSON.parse(outputStr);
    return parsed;
  } catch(err){
    console.error('Failed to parse output:' , err)
    return err
  }
}