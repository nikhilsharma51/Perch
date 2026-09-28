
export function getStringParam(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}


export function requireStringParam(value: string | string[] | undefined, name: string): string {
  const result = getStringParam(value);
  if (!result) throw new Error(`${name} is required`);
  return result;
}
