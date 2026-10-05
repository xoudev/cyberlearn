/**
 * The value a component attribute spells out, read off the syntax tree and
 * never evaluated: `options={["a", "b"]}` is the array, `correct={1}` the
 * number, a bare attribute is true. Anything that computes a value, which
 * remarkLiteralValuesOnly refuses anyway, reads as undefined.
 *
 * Shared by the quiz extractor (the answer key) and the block editor (every
 * attribute of every component), which must agree on what an author wrote.
 */

export interface EsNode {
  type: string;
  [key: string]: unknown;
}

export interface MdNode {
  type: string;
  name?: string | null;
  attributes?: unknown[];
  children?: unknown[];
}

const NOT_A_VALUE = Symbol("not a value");

/** The value an expression spells out, or NOT_A_VALUE when it computes one. */
function valueOf(node: EsNode): unknown {
  switch (node.type) {
    case "Literal":
      return node.value;
    case "TemplateLiteral": {
      if ((node.expressions as unknown[]).length > 0) return NOT_A_VALUE;
      const [quasi] = node.quasis as { value: { cooked: string | null } }[];
      return quasi?.value.cooked ?? NOT_A_VALUE;
    }
    case "ArrayExpression": {
      const items = (node.elements as (EsNode | null)[]).map((e) =>
        e === null || e.type === "SpreadElement" ? NOT_A_VALUE : valueOf(e),
      );
      return items.includes(NOT_A_VALUE) ? NOT_A_VALUE : items;
    }
    case "ObjectExpression": {
      const out: Record<string, unknown> = {};
      for (const p of node.properties as EsNode[]) {
        if (p.type !== "Property" || p.computed === true || p.kind !== "init") return NOT_A_VALUE;
        const key = p.key as EsNode;
        const name = key.type === "Identifier" ? key.name : key.value;
        const value = valueOf(p.value as EsNode);
        if (value === NOT_A_VALUE) return NOT_A_VALUE;
        out[String(name)] = value;
      }
      return out;
    }
    case "UnaryExpression": {
      const argument = node.argument as EsNode;
      if (argument.type !== "Literal" || typeof argument.value !== "number") return NOT_A_VALUE;
      if (node.operator === "-") return -argument.value;
      if (node.operator === "+") return argument.value;
      return NOT_A_VALUE;
    }
    default:
      return NOT_A_VALUE;
  }
}

export function attributeValue(attribute: unknown): unknown {
  // SAFETY: an mdxJsxAttribute: a name and a value that is a string, null (a
  // bare attribute), or an expression carrying its ESTree.
  const { value } = attribute as { value: unknown };
  if (value === null) return true;
  if (typeof value === "string") return value;
  const program = (value as { data?: { estree?: { body?: EsNode[] } } }).data?.estree;
  const statement = program?.body?.[0];
  if (program?.body?.length !== 1 || statement?.type !== "ExpressionStatement") return undefined;
  const result = valueOf(statement.expression as EsNode);
  return result === NOT_A_VALUE ? undefined : result;
}
