import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDocumentTools } from '../../src/talk_to_figma_mcp/tools/document-tools';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket', () => ({
  sendCommandToFigma: jest.fn().mockResolvedValue({
    nodeId: "1:2",
    nodeType: "RECTANGLE",
    css: { "background": "#FF0000" },
    cssString: "background: #FF0000;",
  }),
  joinChannel: jest.fn().mockResolvedValue(undefined),
}));

describe("get_css tool integration", () => {
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
        if (name === 'get_css') {
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

  it("calls sendCommandToFigma with the get_css command and nodeId", async () => {
    await callToolWithValidation({ nodeId: "1:2" });

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    const [command, payload] = mockSendCommand.mock.calls[0];
    expect(command).toBe("get_css");
    expect(payload).toEqual({ nodeId: "1:2" });
  });

  it("returns JSON-serialized result with css and cssString", async () => {
    const result = await callToolWithValidation({ nodeId: "1:2" });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveProperty("nodeId", "1:2");
    expect(parsed).toHaveProperty("nodeType", "RECTANGLE");
    expect(parsed).toHaveProperty("css");
    expect(parsed).toHaveProperty("cssString");
  });

  it("returns text error content when sendCommandToFigma throws", async () => {
    mockSendCommand.mockRejectedValueOnce(new Error("websocket disconnected"));

    const result = await callToolWithValidation({ nodeId: "1:2" });

    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Error getting CSS");
    expect(result.content[0].text).toContain("websocket disconnected");
  });

  it("requires nodeId (zod validation rejects missing nodeId)", async () => {
    await expect(callToolWithValidation({})).rejects.toThrow();
    expect(mockSendCommand).not.toHaveBeenCalled();
  });
});
