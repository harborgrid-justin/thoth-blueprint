import { tableColors } from "@/lib/colors";
import { DbRelationship } from "@/lib/constants";
import { organizeTablesByRelationships } from "@/lib/layout-algorithms";
import {
  type AppEdge,
  type AppNode,
  type AppNoteNode,
  type Column,
  type Diagram,
  type EdgeData,
  type Index,
  type IndexType,
} from "@/lib/types";
import { uuid } from "../utils";

interface ParsedForeignKey {
  sourceTable: string;
  sourceColumns: string[];
  targetTable: string;
  targetColumns: string[];
  constraintName: string;
  onDelete?: string;
  onUpdate?: string;
}

interface Diagnostic {
  level: "warning" | "error";
  message: string;
  table?: string;
  detail?: string;
}

function stripComments(sql: string): string {
  let out = "";
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment: false | "dash" | "hash" = false;
  let inBlockComment = false;
  let inVersionedComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const prev = sql[i - 1];
    const next = sql[i + 1];
    const next2 = sql[i + 2];
    const isEscaped = prev === "\\";

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
        out += ch;
      }
      continue;
    }

    if (inBlockComment || inVersionedComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        inVersionedComment = false;
        i++;
        continue;
      }
      if (inVersionedComment) out += ch;
      continue;
    }

    if (!isEscaped) {
      if (ch === "'" && !inDouble && !inBacktick) {
        inSingle = !inSingle;
      } else if (ch === '"' && !inSingle && !inBacktick) {
        inDouble = !inDouble;
      } else if (ch === "`" && !inSingle && !inDouble) {
        inBacktick = !inBacktick;
      }
    }

    if (!inSingle && !inDouble && !inBacktick) {
      if (ch === "-" && next === "-") {
        inLineComment = "dash";
        i++;
        continue;
      }
      if (ch === "#") {
        inLineComment = "hash";
        continue;
      }

      if (ch === "/" && next === "*") {
        if (next2 === "!") {
          inVersionedComment = true;
          i += 2;
          continue;
        } else {
          inBlockComment = true;
          i++;
          continue;
        }
      }
    }

    out += ch;
  }

  return out;
}

function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;

  const pushCurrent = () => {
    const s = current.trim();
    if (s.length) statements.push(s);
    current = "";
  };

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    // Handle escapes inside quotes
    const prev = sql[i - 1];
    const isEscaped = prev === "\\";

    if (!isEscaped) {
      if (ch === "'" && !inDouble && !inBacktick) inSingle = !inSingle;
      else if (ch === '"' && !inSingle && !inBacktick) inDouble = !inDouble;
      else if (ch === "`" && !inSingle && !inDouble) inBacktick = !inBacktick;
      else if (!inSingle && !inDouble && !inBacktick) {
        if (ch === "(") depth++;
        else if (ch === ")" && depth > 0) depth--;
      }
    }

    if (ch === ";" && !inSingle && !inDouble && !inBacktick && depth === 0) {
      pushCurrent();
    } else {
      current += ch;
    }
  }

  pushCurrent();

  // Keep only CREATE TABLE and similar DDL statements
  return statements.filter((s) => /^\s*CREATE\s+TABLE/i.test(s));
}

function normalizeIdentifier(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  // If quoted with backticks, take literal content
  if (trimmed.startsWith("`") && trimmed.endsWith("`")) {
    return trimmed.slice(1, -1);
  }
  // If quoted with double-quotes (rare in MySQL), strip
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.includes(".")) {
    const parts = trimmed.split(".");
    const lastPart = parts[parts.length - 1];
    return lastPart ? normalizeIdentifier(lastPart) : "";
  }
  return trimmed;
}

function splitTopLevelItems(body: string): string[] {
  const items: string[] = [];
  let current = "";
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    const prev = body[i - 1];
    const isEscaped = prev === "\\";

    if (!isEscaped) {
      if (ch === "'" && !inDouble && !inBacktick) inSingle = !inSingle;
      else if (ch === '"' && !inSingle && !inBacktick) inDouble = !inDouble;
      else if (ch === "`" && !inSingle && !inDouble) inBacktick = !inBacktick;
      else if (!inSingle && !inDouble && !inBacktick) {
        if (ch === "(") depth++;
        else if (ch === ")" && depth > 0) depth--;
      }
    }

    if (ch === "," && !inSingle && !inDouble && !inBacktick && depth === 0) {
      const item = current.trim();
      if (item.length) items.push(item);
      current = "";
    } else {
      current += ch;
    }
  }
  const last = current.trim();
  if (last.length) items.push(last);
  return items;
}

function parseQuotedList(listStr: string): string[] {
  const result: string[] = [];
  let token = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < listStr.length; i++) {
    const ch = listStr[i];
    const prev = listStr[i - 1];
    const isEscaped = prev === "\\";

    if (!isEscaped) {
      if (ch === "'" && !inDouble) {
        if (inSingle) {
          result.push(token);
          token = "";
          inSingle = false;
          continue;
        } else {
          inSingle = true;
          continue;
        }
      } else if (ch === '"' && !inSingle) {
        if (inDouble) {
          result.push(token);
          token = "";
          inDouble = false;
          continue;
        } else {
          inDouble = true;
          continue;
        }
      }
    }

    if (inSingle || inDouble) {
      token += ch;
    }
  }

  return result.map((s) => s.replace(/''/g, "'"));
}

function extractTableOptionsTail(statement: string) {
  const match = statement.match(/\)\s*(.*)$/i);
  return match ? match[1] : "";
}

export async function parseMySqlDdlAsync(
  ddl: string,
  onProgress?: (progress: number, label?: string) => void,
  reorganizeAfterImport: boolean = false
): Promise<Diagram["data"]> {
  const diagnostics: Diagnostic[] = [];
  const nodes: AppNode[] = [];
  const foreignKeys: ParsedForeignKey[] = [];

  const cleaned = stripComments(ddl);
  const statements = splitStatements(cleaned);
  const total = statements.length || 1;

  const totalTables = statements.length;
  const NUM_COLUMNS = Math.min(Math.max(Math.ceil(Math.sqrt(totalTables * 1.5)), 4), 8);
  const CARD_WIDTH = 288;
  const X_GAP = 32;
  const Y_GAP = 32;
  const columnYOffset: number[] = Array(NUM_COLUMNS).fill(20);
  const estimateHeight = (columnCount: number) => 60 + columnCount * 28;
  
  const findMinHeightColumn = () => {
    let minHeight = columnYOffset[0] ?? 0;
    let minIndex = 0;
    for (let i = 1; i < NUM_COLUMNS; i++) {
      const height = columnYOffset[i] ?? 0;
      if (height < minHeight) {
        minHeight = height;
        minIndex = i;
      }
    }
    return minIndex;
  };

  for (let statementIndex = 0; statementIndex < statements.length; statementIndex++) {
    const statement = statements[statementIndex];

    const tableNameMatch = statement?.match(/CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?([^\s(]+)/i);
    if (!tableNameMatch) {
      diagnostics.push({ level: "warning", message: "Unable to parse table name", detail: statement?.slice(0, 120) || "" });
      continue;
    }

    const rawTableName = tableNameMatch[2];
    const tableName = normalizeIdentifier(rawTableName ?? "");

    const columns: Column[] = [];
    const indices: Index[] = [];
    let tableComment = "";

    const tableBodyMatch = statement?.match(/\(([\s\S]*)\)/);
    if (!tableBodyMatch) {
      diagnostics.push({ level: "warning", message: "Missing table body", table: tableName });
      continue;
    }

    const tableBody = tableBodyMatch[1] || "";

    const items = splitTopLevelItems(tableBody);

    items.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) return;

      if (/^PRIMARY\s+KEY/i.test(line)) {
        const pkMatch = line.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
          const pkCols = (pkMatch[1] || "")
            .split(",")
            .map((c) => normalizeIdentifier(c.split(" ")[0]?.trim() ?? ""))
            .filter(Boolean);
          columns.forEach((c) => {
            if (pkCols.includes(c.name)) {
              c.pk = true;
              c.nullable = false;
            }
          });
        }
        return;
      }

      if (/^(UNIQUE\s+)?(KEY|INDEX|FULLTEXT|SPATIAL)/i.test(line)) {
        let indexType: IndexType = "INDEX";
        if (/^UNIQUE/i.test(line)) indexType = "UNIQUE";
        else if (/^FULLTEXT/i.test(line)) indexType = "FULLTEXT";
        else if (/^SPATIAL/i.test(line)) indexType = "SPATIAL";

        const idxMatch = line.match(/(?:UNIQUE\s+)?(?:FULLTEXT\s+|SPATIAL\s+)?(?:KEY|INDEX)\s+(?:`?([^`\s]+)`?\s+)?\(([^)]+)\)/i);
        if (idxMatch) {
          const indexName = normalizeIdentifier(idxMatch[1] || `idx_${tableName}`);
          const colsStr = idxMatch[2];
          const colNames = (colsStr ?? "")
            .split(",")
            .map((c) => c.trim())
            .map((c) => normalizeIdentifier(c.split(" ")[0]?.split("(")[0] ?? ""))
            .filter(Boolean);

          const prefixLengths: Record<string, number> = {};
          (colsStr ?? "")
            .split(",")
            .map((c) => c.trim())
            .forEach((c) => {
              const name = normalizeIdentifier(c.split(" ")[0]?.split("(")[0] ?? "");
              const p = c.match(/\((\d+)\)/);
              if (name && p && p[1]) prefixLengths[name] = parseInt(p[1], 10);
            });

          const colIds = colNames
            .map((n) => columns.find((c) => c.name === n)?.id)
            .filter((id): id is string => !!id);

          if (colIds.length > 0) {
            indices.push({
              id: uuid(),
              name: indexName,
              columns: colIds,
              isUnique: indexType === "UNIQUE",
              type: indexType,
              // @ts-expect-error store prefix lengths for future use
              prefixLengths,
            });
          }
        }
        return;
      }

      if (/^(CONSTRAINT\s+[^\s]+\s+)?FOREIGN\s+KEY/i.test(line)) {
        const namedFkMatch = line.match(/CONSTRAINT\s+`?([^`\s]+)`?\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/i);
        const simpleFkMatch = !namedFkMatch
          ? line.match(/FOREIGN\s+KEY\s*(?:`?([^`\s]+)`?\s*)?\(([^)]+)\)\s+REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/i)
          : null;
        const m = namedFkMatch || simpleFkMatch;
        if (m) {
          const constraintName = normalizeIdentifier(m[1] || `fk_${tableName}_${uuid().slice(0, 8)}`);
          const sourceCols = (m[2] ?? "")
            .split(",")
            .map((c) => normalizeIdentifier(c.split(" ")[0]?.trim() ?? ""))
            .filter(Boolean);
          const targetTbl = normalizeIdentifier(m[3] ?? "");
          const targetCols = (m[4] ?? "")
            .split(",")
            .map((c) => normalizeIdentifier(c.split(" ")[0]?.trim() ?? ""))
            .filter(Boolean);

          let onDelete: string | undefined;
          let onUpdate: string | undefined;
          const delMatch = line.match(/ON\s+DELETE\s+(RESTRICT|CASCADE|SET\s+NULL|NO\s+ACTION)/i);
          const updMatch = line.match(/ON\s+UPDATE\s+(RESTRICT|CASCADE|SET\s+NULL|NO\s+ACTION)/i);
          if (delMatch && delMatch[1]) onDelete = delMatch[1].toUpperCase().replace(/\s+/g, " ");
          if (updMatch && updMatch[1]) onUpdate = updMatch[1].toUpperCase().replace(/\s+/g, " ");

          const fkObj: ParsedForeignKey = {
            sourceTable: tableName,
            sourceColumns: sourceCols,
            targetTable: targetTbl,
            targetColumns: targetCols,
            constraintName,
          };
          if (onDelete) fkObj.onDelete = onDelete;
          if (onUpdate) fkObj.onUpdate = onUpdate;

          foreignKeys.push(fkObj);
        }
        return;
      }

      const colMatch = line.match(/^`?([^`\s]+)`?\s+([^\s]+(?:\([^)]*\))?(?:\s+(?:UNSIGNED|ZEROFILL))?)(.*)$/i);
      if (!colMatch) return;

      const name = normalizeIdentifier(colMatch[1] || "");
      const typeString = (colMatch[2] || "").trim();
      const rest = (colMatch[3] || "").trim();

      const [type, length, precision, scale] = parseType(typeString);

      const isNotNull = /\bNOT\s+NULL\b/i.test(rest);
      const isPrimaryKey = /\bPRIMARY\s+KEY\b/i.test(rest);
      const isAutoIncrement = /\bAUTO_INCREMENT\b/i.test(rest);
      const isUnique = /\bUNIQUE\b/i.test(rest);
      const isUnsigned = /\bUNSIGNED\b/i.test(typeString);

      let defaultValue: string | number | null | undefined;
      const defaultMatch = rest.match(/\bDEFAULT\s+(?:'([^']*(?:''[^']*)*)'|(NULL)|([^\s,]+))/i);
      if (defaultMatch) {
        if (defaultMatch[2]) defaultValue = null;
        else if (defaultMatch[1]) defaultValue = defaultMatch[1].replace(/''/g, "'");
        else if (defaultMatch[3]) {
          const val = defaultMatch[3];
          if (/^-?\d+(\.\d+)?$/.test(val)) defaultValue = parseFloat(val);
          else defaultValue = val;
        }
      }

      const commentMatch = rest.match(/\bCOMMENT\s+'([^']*)'/i);
      const comment = commentMatch?.[1] || "";

      let enumValues: string | undefined;
      const enumMatch = typeString.match(/^(ENUM|SET)\s*\((.*)\)/i);
      if (enumMatch) {
        const raw = enumMatch[2];
        const values = parseQuotedList(raw || "");
        enumValues = values.join(",");
      }

      const column: Column = {
        id: uuid(),
        name,
        type,
        length: length || 0,
        precision: precision || 0,
        scale: scale || 0,
        nullable: !isNotNull && !isPrimaryKey,
        pk: isPrimaryKey,
        isAutoIncrement,
        isUnique,
        isUnsigned,
        defaultValue,
        comment,
      };
      if (enumValues) column.enumValues = enumValues;
      columns.push(column);

      if (/\bREFERENCES\b/i.test(rest)) {
        const refMatch = rest.match(/REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/i);
        if (refMatch) {
          const targetTbl = normalizeIdentifier(refMatch[1] || "");
          const targetCol = normalizeIdentifier(refMatch[2]?.split(",")[0] || "");
          let onDelete: string | undefined;
          let onUpdate: string | undefined;
          const delMatch = rest.match(/ON\s+DELETE\s+(RESTRICT|CASCADE|SET\s+NULL|NO\s+ACTION)/i);
          const updMatch = rest.match(/ON\s+UPDATE\s+(RESTRICT|CASCADE|SET\s+NULL|NO\s+ACTION)/i);
          if (delMatch && delMatch[1]) onDelete = delMatch[1].toUpperCase().replace(/\s+/g, " ");
          if (updMatch && updMatch[1]) onUpdate = updMatch[1].toUpperCase().replace(/\s+/g, " ");

          const fkObj: ParsedForeignKey = {
            sourceTable: tableName,
            sourceColumns: [name],
            targetTable: targetTbl,
            targetColumns: [targetCol],
            constraintName: `fk_${tableName}_${name}`,
          };
          if (onDelete) fkObj.onDelete = onDelete;
          if (onUpdate) fkObj.onUpdate = onUpdate;

          foreignKeys.push(fkObj);
        } else {
          diagnostics.push({ level: "warning", message: "Unrecognized inline REFERENCES syntax", table: tableName, detail: rest });
        }
      }
    });

    const tableOptions = extractTableOptionsTail(statement || "") ?? "";
    const tCommentMatch = tableOptions?.match(/\bCOMMENT\s*=?\s*'([^']*)'/i);
    if (tCommentMatch) tableComment = tCommentMatch[1] || "";
    const engineMatch = tableOptions?.match(/\bENGINE\s*=\s*([A-Za-z0-9_]+)/i);
    const charsetMatch = tableOptions?.match(/\b(?:DEFAULT\s+)?CHARSET\s*=\s*([A-Za-z0-9_]+)/i) || tableOptions?.match(/\bCHARACTER\s+SET\s*=\s*([A-Za-z0-9_]+)/i);
    const collateMatch = tableOptions?.match(/\bCOLLATE\s*=\s*([A-Za-z0-9_]+)/i);

    const opts: string[] = [];
    if (engineMatch) opts.push(`ENGINE=${engineMatch[1]}`);
    if (charsetMatch) opts.push(`CHARSET=${charsetMatch[1]}`);
    if (collateMatch) opts.push(`COLLATE=${collateMatch[1]}`);
    if (opts.length) {
      tableComment = tableComment ? `${tableComment} | ${opts.join("; ")}` : opts.join("; ");
    }

    const colIndex = findMinHeightColumn();
    const x = colIndex * (CARD_WIDTH + X_GAP);
    const y = columnYOffset[colIndex] ?? 0;

    const node: AppNode = {
      id: uuid(),
      type: "table",
      position: { x, y },
      data: {
        label: tableName,
        columns,
        indices,
        comment: tableComment,
        color: tableColors[statementIndex % tableColors.length] || "",
        order: statementIndex,
      },
    };
    nodes.push(node);
    columnYOffset[colIndex] = (columnYOffset[colIndex] ?? 0) + estimateHeight(columns.length) + Y_GAP;

    if (onProgress) {
      const pct = Math.round(((statementIndex + 1) / total) * 100);
      onProgress(pct, `Parsed ${statementIndex + 1}/${total} tables`);
    }
    // Yield to the event loop to keep UI responsive
    await new Promise((r) => setTimeout(r, 0));
  }

  const tableMap = new Map<string, AppNode>();
  nodes.forEach((n) => tableMap.set(n.data.label, n));

  const edges: AppEdge[] = foreignKeys.flatMap((fk) => {
    const sourceNode = tableMap.get(fk.sourceTable);
    const targetNode = tableMap.get(fk.targetTable);
    if (!sourceNode || !targetNode) {
      diagnostics.push({ level: "warning", message: "FK references unknown table", detail: `${fk.sourceTable} -> ${fk.targetTable}` });
      return [];
    }

    const sourceCols = fk.sourceColumns
      .map((name) => sourceNode.data.columns.find((c) => c.name === name))
      .filter((c): c is Column => !!c);
    const targetCols = fk.targetColumns
      .map((name) => targetNode.data.columns.find((c) => c.name === name))
      .filter((c): c is Column => !!c);

    if (sourceCols.length !== fk.sourceColumns.length || targetCols.length !== fk.targetColumns.length) {
      diagnostics.push({ level: "warning", message: "FK columns not found", detail: fk.constraintName });
      return [];
    }

    const relationship = determineRelationshipComposite(sourceCols, targetCols, sourceNode, targetNode);

    const edgeList: AppEdge[] = [];
    const pairCount = Math.min(sourceCols.length, targetCols.length);
    for (let i = 0; i < pairCount; i++) {
      const sc = sourceCols[i];
      const tc = targetCols[i];
      const edgeData: EdgeData = {
        relationship,
        constraintName: fk.constraintName,
        sourceColumns: fk.sourceColumns,
        targetColumns: fk.targetColumns,
        isComposite: fk.sourceColumns.length > 1 || fk.targetColumns.length > 1,
        ...(fk.onDelete ? { onDelete: fk.onDelete } : {}),
        ...(fk.onUpdate ? { onUpdate: fk.onUpdate } : {}),
      };
      edgeList.push({
        id: uuid(),
        source: sourceNode.id,
        target: targetNode.id,
        sourceHandle: `${sc?.id}-right-source`,
        targetHandle: `${tc?.id}-left-target`,
        type: "custom",
        data: edgeData,
      });
    }

    return edgeList;
  });

  const notes: AppNoteNode[] = [];
  if (diagnostics.length > 0) {
    const text = diagnostics
      .map((d) => `${d.level.toUpperCase()}: ${d.message}${d.table ? ` [${d.table}]` : ""}${d.detail ? ` - ${d.detail}` : ""}`)
      .join("\n");
    notes.push({ id: uuid(), type: "note", position: { x: 20, y: 20 }, data: { text, color: "#fde68a" } });
  }

  let finalResult = { nodes, edges, notes, zones: [], viewport: { x: 0, y: 0, zoom: 1 }, isLocked: false };

  // Apply relationship-based reorganization if requested
  if (reorganizeAfterImport && nodes.length > 0) {
    const organizedNodes = organizeTablesByRelationships(nodes, edges);
    finalResult = { ...finalResult, nodes: organizedNodes };
  }

  return finalResult;
}

function determineRelationshipComposite(
  sourceColumns: Column[],
  targetColumns: Column[],
  sourceTable: AppNode,
  targetTable: AppNode
): string {
  const sourceIds = new Set(sourceColumns.map((c) => c.id));
  const targetIds = new Set(targetColumns.map((c) => c.id));

  const hasUniqueIndexFor = (node: AppNode, ids: Set<string>): boolean => {
    const indices = node.data.indices || [];
    return indices.some((idx) => {
      if (!idx.isUnique) return false;
      if (idx.columns.length !== ids.size) return false;
      return idx.columns.every((cid) => ids.has(cid));
    });
  };

  const isSourceUnique =
    // single-column unique or composite index match
    (sourceColumns.length === 1 && (sourceColumns[0]?.isUnique || sourceColumns[0]?.pk)) ||
    hasUniqueIndexFor(sourceTable, sourceIds);

  const isTargetUnique =
    (targetColumns.length === 1 && (targetColumns[0]?.pk || targetColumns[0]?.isUnique)) ||
    hasUniqueIndexFor(targetTable, targetIds) ||
    // Composite PK treated as unique
    (() => {
      const pkCols = (targetTable.data.columns as Column[]).filter((c) => c.pk).map((c) => c.id);
      return pkCols.length === targetIds.size && pkCols.every((id) => targetIds.has(id));
    })();

  if (isSourceUnique && isTargetUnique) return DbRelationship.ONE_TO_ONE;
  if (isTargetUnique) return DbRelationship.MANY_TO_ONE;
  return DbRelationship.MANY_TO_ONE;
}

function parseType(
  typeString: string
): [string, number | undefined, number | undefined, number | undefined] {
  const cleanType = typeString.replace(/\s+(UNSIGNED|ZEROFILL)/gi, "");
  const typeMatch = cleanType.match(/^(\w+)(?:\(([^)]*)\))?/i);
  if (!typeMatch) {
    return [typeString.toUpperCase(), undefined, undefined, undefined];
  }

  const type = (typeMatch[1] || "").toUpperCase();
  const paramsStr = typeMatch[2];

  if (!paramsStr) {
    return [type, undefined, undefined, undefined];
  }

  if (type === "ENUM" || type === "SET") {
    // values handled separately
    return [type, undefined, undefined, undefined];
  }

  // For fractional time types: DATETIME(p), TIME(p)
  if (["DATETIME", "TIME", "TIMESTAMP"].includes(type)) {
    const p = parseInt(paramsStr.trim(), 10);
    return [type, isNaN(p) ? undefined : p, undefined, undefined];
  }

  const params = paramsStr
    .split(",")
    .map((p) => {
      const num = parseInt(p.trim(), 10);
      return isNaN(num) ? undefined : num;
    })
    .filter((p): p is number => p !== undefined);

  if (params.length === 2) {
    return [type, undefined, params[0], params[1]];
  }
  if (params.length === 1) {
    return [type, params[0], undefined, undefined];
  }

  return [type, undefined, undefined, undefined];
}
