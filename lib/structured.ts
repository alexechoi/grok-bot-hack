/** Normalize literal control characters in JSON string values; never evaluate code or invent fields. */
export function parseStructuredReply(text:string):unknown {
 const clean=text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
 try{return JSON.parse(clean);}catch{}
 let quoted=false,escaped=false,normalized='';
 for(const char of clean){
  if(quoted&&char.charCodeAt(0)<32){normalized+=JSON.stringify(char).slice(1,-1);escaped=false;continue;}
  normalized+=char;
  if(escaped){escaped=false;continue;}
  if(char==='\\'&&quoted){escaped=true;continue;}
  if(char==='"')quoted=!quoted;
 }
 return JSON.parse(normalized);
}
