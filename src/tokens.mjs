// Token counting + the measured "always-on" cost of running ZeroContext over MCP.
//
// Tokenizer choice: Anthropic does not publish an exact local tokenizer for current
// Claude models, so we use o200k_base (the GPT-4o/4.1 BPE) as a labeled proxy. The
// headline ZeroContext pitch is a *ratio* (preloaded rules vs. a matching slice), and a
// ratio is tokenizer-robust: a constant per-tokenizer bias sits in both the numerator
// and denominator and cancels. Absolute counts are therefore an estimate (~±10–15% of
// Claude's exact count), and we always say so.
import { encode } from "gpt-tokenizer/encoding/o200k_base";

export const TOKENIZER_LABEL =
  "o200k_base (gpt-tokenizer) — proxy for Claude, ~±10–15% vs. Claude's exact count";

export function countTokens(text) {
  if (!text) return 0;
  return encode(text).length;
}

// ---------------------------------------------------------------------------
// ZeroContext's fixed overhead. These two strings are the product's MCP surface;
// the client renders them into the model's context every single turn, whether or
// not `get_rules` is ever called. We tokenize the real strings so the overhead is a
// measured number, not a guess.
// ---------------------------------------------------------------------------

export const MCP_INSTRUCTIONS =
  "ZeroContext is active. Before editing any file, call the `get_rules` tool with the " +
  "file's path to fetch the rules that apply to it. Do not rely on preloaded rules — " +
  "fetch them just in time, per file.";

export const GET_RULES_TOOL = {
  name: "get_rules",
  description:
    "Fetch the ZeroContext rules that apply to a given file before editing it. Call " +
    "with the file path you are about to modify.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Repo-relative path of the file about to be edited.",
      },
      task: {
        type: "string",
        description: "One-line description of the change being made.",
      },
    },
    required: ["path"],
  },
};

// Model-side cost of the agent emitting one tool call (it writes the call into its
// own output, which then persists in history). This is an assumption, labeled as such
// wherever it surfaces — unlike the overhead above, it isn't read off a fixed string.
export const CALL_TOKENS = 40;

// Measured fixed overhead: MCP instructions + the get_rules tool schema footprint.
export function overheadTokens() {
  return countTokens(MCP_INSTRUCTIONS) + countTokens(JSON.stringify(GET_RULES_TOOL));
}
