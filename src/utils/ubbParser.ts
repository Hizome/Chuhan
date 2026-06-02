import type { TreeState, TreeNode, GameHeaders, Move } from "../types/xiangqi";
import { START_FEN } from "../types/xiangqi";

/**
 * UBB (DhtmlXQ) Parser
 *
 * DhtmlXQ format uses a coordinate system where:
 * - Files (columns) are 0-8 from right to left for red's perspective
 * - Ranks (rows) are 0-9 from top to bottom
 *
 * Move encoding: each move is 4 digits, e.g., "6967" means from (6,9) to (6,7)
 * In standard algebraic: file = 'abcdefghi'[9 - x], rank = y + 1
 */

// Map internal coordinates to standard algebraic notation
const FILES = "abcdefghi";

function coordToSquare(x: number, y: number): string {
  // DhtmlXQ: x=0 is rightmost (i file), x=8 is leftmost (a file)
  const file = FILES[8 - x];
  const rank = y + 1;
  return `${file}${rank}`;
}

function parseMoveCode(code: string, offset: number): Move {
  const srcX = parseInt(code[offset]);
  const srcY = parseInt(code[offset + 1]);
  const dstX = parseInt(code[offset + 2]);
  const dstY = parseInt(code[offset + 3]);
  return {
    from: coordToSquare(srcX, srcY),
    to: coordToSquare(dstX, dstY),
  };
}

function getVarTag(content: string, tag: string): string {
  const regex = new RegExp(`\\[DhtmlXQ_${tag}\\](.*?)\\[/DhtmlXQ_${tag}\\]`, "is");
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

/**
 * Simple FEN generator for Chinese chess after a move.
 * This is a placeholder - in production you'd use a proper xiangqi move generator.
 * For now, we store moves and let the Wukong engine validate them.
 */
function applyMove(fen: string, move: Move): string {
  // Return original FEN for now - the engine will compute the actual FEN
  // when the move is played on the board
  return fen;
}

function createNode(
  fen: string,
  move: Move | null = null,
  san: string | null = null,
  comment: string = ""
): TreeNode {
  return {
    fen,
    move,
    san,
    children: [],
    annotations: [],
    comment,
    score: null,
    depth: null,
    shapes: [],
  };
}

export function parseUBB(ubb: string): TreeState {
  const headers: GameHeaders = {
    title: getVarTag(ubb, "title") || undefined,
    red: getVarTag(ubb, "red") || undefined,
    black: getVarTag(ubb, "black") || undefined,
    date: getVarTag(ubb, "date") || undefined,
    site: getVarTag(ubb, "site") || undefined,
    event: getVarTag(ubb, "event") || undefined,
    result: getVarTag(ubb, "result") || undefined,
    round: getVarTag(ubb, "round") || undefined,
  };

  const moveList = getVarTag(ubb, "movelist");
  const root = createNode(START_FEN);

  if (!moveList) {
    return {
      root,
      headers,
      position: [],
      dirty: false,
    };
  }

  // Parse mainline moves
  let currentNode = root;
  let currentFen = START_FEN;

  for (let i = 0; i < moveList.length; i += 4) {
    if (i + 4 > moveList.length) break;

    const moveCode = moveList.substring(i, i + 4);
    const move = parseMoveCode(moveCode, 0);

    // Try to get comment for this move
    const moveNumber = Math.floor(i / 4) + 1;
    const comment = getVarTag(ubb, `comment${moveNumber}`);

    // Generate a simple SAN placeholder
    const san = `${move.from}${move.to}`;

    const newNode = createNode(currentFen, move, san, comment);
    currentNode.children.push(newNode);
    currentNode = newNode;
  }

  // Parse variations if present
  // For now, we only parse the mainline from movelist
  // Full variation parsing would require the DhtmlXQ_move_0_1_xxx tags

  return {
    root,
    headers,
    position: [],
    dirty: false,
  };
}

export function treeToUBB(tree: TreeState): string {
  const { root, headers } = tree;

  let ubb = "";
  ubb += `[DhtmlXQ_ver]www_dpxq_com[/DhtmlXQ_ver]\n`;
  ubb += `[DhtmlXQ_init]500,350[/DhtmlXQ_init]\n`;

  if (headers.title) ubb += `[DhtmlXQ_title]${headers.title}[/DhtmlXQ_title]\n`;
  if (headers.red) ubb += `[DhtmlXQ_red]${headers.red}[/DhtmlXQ_red]\n`;
  if (headers.black) ubb += `[DhtmlXQ_black]${headers.black}[/DhtmlXQ_black]\n`;
  if (headers.date) ubb += `[DhtmlXQ_date]${headers.date}[/DhtmlXQ_date]\n`;
  if (headers.site) ubb += `[DhtmlXQ_site]${headers.site}[/DhtmlXQ_site]\n`;
  if (headers.event) ubb += `[DhtmlXQ_event]${headers.event}[/DhtmlXQ_event]\n`;
  if (headers.result) ubb += `[DhtmlXQ_result]${headers.result}[/DhtmlXQ_result]\n`;

  // Build movelist from mainline
  let movelist = "";
  let comments = "";
  let node = root;
  let moveIndex = 0;

  while (node.children[0]) {
    const child = node.children[0];
    if (child.move) {
      // Convert algebraic back to DhtmlXQ coordinates
      const fromFile = 8 - FILES.indexOf(child.move.from[0]);
      const fromRank = parseInt(child.move.from[1]) - 1;
      const toFile = 8 - FILES.indexOf(child.move.to[0]);
      const toRank = parseInt(child.move.to[1]) - 1;
      movelist += `${fromFile}${fromRank}${toFile}${toRank}`;

      if (child.comment) {
        comments += `[DhtmlXQ_comment${moveIndex}]${child.comment}[/DhtmlXQ_comment${moveIndex}]\n`;
      }
      moveIndex++;
    }
    node = child;
  }

  ubb += `[DhtmlXQ_movelist]${movelist}[/DhtmlXQ_movelist]\n`;
  ubb += comments;

  return ubb;
}
