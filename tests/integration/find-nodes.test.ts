import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDocumentTools } from '../../src/talk_to_figma_mcp/tools/document-tools';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket', () => ({
  sendCommandToFigma: jest.fn().mockResolvedValue({
    results: [],
    total: 0,
    truncated: false,
  }),
  joinChannel: jest.fn().mockResolvedValue(undefined),
}));

describe("find_nodes tool integration", () => {
  let server: McpServer;
  let mockSendCommand: jest.Mock;
  let toolHandler: Function;
  let toolSchema: z.ZodObject<any>;

  beforeEach(() => {
    server = new McpServer(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    mockSendCommand = require('../../src/talk_to_figma_mcp/utils/websocket').sendCommandToFigma;
    mockSendCommand.mockClear();

    const originalTool = server.tool.bind(server);
    jest.spyOn(server, 'tool').mockImplementation((...args: any[]) => {
      if (args.length === 4) {
        const [name, description, schema, handler] = args;
        if (name === 'find_nodes') {
          toolHandler = handler;
          toolSchema = z.object(schema);
        }
      }
      return (originalTool as any)(...args);
    });

    registerDocumentTools(server);
  });

  async function callToolWithValidation(args: any) {
    const validatedArgs = toolSchema.parse(args);
    const result = await toolHandler(validatedArgs, { meta: {} });
    return result;
  }

  it("calls sendCommandToFigma with find_nodes and exact name filter", async () => {
    await callToolWithValidation({ name: "Button" });

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    const [command, payload] = mockSendCommand.mock.calls[0];
    expect(command).toBe("find_nodes");
    expect(payload.name).toBe("Button");
  });

  it("calls sendCommandToFigma with types array filter", async () => {
    await callToolWithValidation({ types: ["FRAME", "TEXT"] });

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    const [, payload] = mockSendCommand.mock.calls[0];
    expect(payload.types).toEqual(["FRAME", "TEXT"]);
  });

  it("returns JSON-serialized find_nodes result", async () => {
    mockSendCommand.mockResolvedValueOnce({
      results: [{ id: "1:2", name: "Button", type: "FRAME", path: "Button" }],
      total: 1,
      truncated: false,
    });

    const result = await callToolWithValidation({ name: "Button" });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveProperty("results");
    expect(parsed).toHaveProperty("total", 1);
    expect(parsed).toHaveProperty("truncated", false);
  });

  it("returns text error content when sendCommandToFigma throws", async () => {
    mockSendCommand.mockRejectedValueOnce(new Error("root not found"));

    const result = await callToolWithValidation({ nodeId: "9:9" });

    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Error finding nodes");
    expect(result.content[0].text).toContain("root not found");
  });

  it("applies default limit of 50 when not provided", async () => {
    await callToolWithValidation({ name: "X" });

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    const [, payload] = mockSendCommand.mock.calls[0];
    expect(payload.limit).toBe(50);
  });
});
