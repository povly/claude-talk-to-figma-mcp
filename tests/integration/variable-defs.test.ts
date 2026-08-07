import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerVariableTools } from '../../src/talk_to_figma_mcp/tools/variable-tools';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket', () => ({
  sendCommandToFigma: jest.fn().mockResolvedValue({
    colors: [],
    spacing: [],
    typography: [],
    radius: [],
    others: [],
  }),
}));

describe("get_variable_defs tool integration", () => {
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
        if (name === 'get_variable_defs') {
          toolHandler = handler;
          toolSchema = z.object(schema);
        }
      }
      return (originalTool as any)(...args);
    });

    registerVariableTools(server);
  });

  async function callToolWithValidation(args: any) {
    const validatedArgs = toolSchema.parse(args);
    const result = await toolHandler(validatedArgs, { meta: {} });
    return result;
  }

  it("calls sendCommandToFigma with the get_variable_defs command", async () => {
    await callToolWithValidation({});

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    const [command] = mockSendCommand.mock.calls[0];
    expect(command).toBe("get_variable_defs");
  });

  it("sends { nodeId: undefined } when nodeId is omitted", async () => {
    await callToolWithValidation({});

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    const [, payload] = mockSendCommand.mock.calls[0];
    expect(payload).toEqual({ nodeId: undefined });
  });

  it("sends the provided nodeId when given", async () => {
    await callToolWithValidation({ nodeId: "123" });

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    const [command, payload] = mockSendCommand.mock.calls[0];
    expect(command).toBe("get_variable_defs");
    expect(payload).toEqual({ nodeId: "123" });
  });

  it("returns text content with JSON-serialized result", async () => {
    const result = await callToolWithValidation({ nodeId: "456" });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveProperty("colors");
    expect(parsed).toHaveProperty("spacing");
    expect(parsed).toHaveProperty("typography");
    expect(parsed).toHaveProperty("radius");
    expect(parsed).toHaveProperty("others");
  });

  it("returns text error content when sendCommandToFigma throws", async () => {
    mockSendCommand.mockRejectedValueOnce(new Error("websocket disconnected"));

    const result = await callToolWithValidation({ nodeId: "789" });

    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Error getting variable defs");
    expect(result.content[0].text).toContain("websocket disconnected");
  });

  it("handles non-Error rejection values", async () => {
    mockSendCommand.mockRejectedValueOnce("string error");

    const result = await callToolWithValidation({});

    expect(result.content[0].text).toContain("Error getting variable defs");
    expect(result.content[0].text).toContain("string error");
  });
});
