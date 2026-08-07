import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDocumentTools } from '../../src/talk_to_figma_mcp/tools/document-tools';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket', () => ({
  sendCommandToFigma: jest.fn().mockResolvedValue({ nodeId: "1:2", nodeType: "COMPONENT" }),
  joinChannel: jest.fn().mockResolvedValue(undefined),
}));

describe("get_component_properties tool integration", () => {
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
        if (name === 'get_component_properties') {
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

  it("calls sendCommandToFigma with the correct command name and nodeId", async () => {
    await callToolWithValidation({ nodeId: "1:2" });

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    const [command, payload] = mockSendCommand.mock.calls[0];
    expect(command).toBe("get_component_properties");
    expect(payload).toEqual({ nodeId: "1:2" });
  });

  it("returns JSON content containing the result from the plugin", async () => {
    mockSendCommand.mockResolvedValueOnce({
      nodeId: "1:2",
      nodeType: "COMPONENT",
      componentKey: "abc123",
      propertyDefinitions: { Variant: { type: "VARIANT", variantOptions: {} } },
    });

    const response = await callToolWithValidation({ nodeId: "1:2" });

    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe("text");
    const parsed = JSON.parse(response.content[0].text);
    expect(parsed).toEqual({
      nodeId: "1:2",
      nodeType: "COMPONENT",
      componentKey: "abc123",
      propertyDefinitions: { Variant: { type: "VARIANT", variantOptions: {} } },
    });
  });

  it("returns a text error when sendCommandToFigma rejects", async () => {
    mockSendCommand.mockRejectedValueOnce(new Error("plugin disconnected"));

    const response = await callToolWithValidation({ nodeId: "9:9" });

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    expect(response.content[0].type).toBe("text");
    expect(response.content[0].text).toContain("Error getting component properties");
    expect(response.content[0].text).toContain("plugin disconnected");
  });

  it("rejects when nodeId is missing (Zod validation)", async () => {
    await expect(callToolWithValidation({})).rejects.toThrow();
    expect(mockSendCommand).not.toHaveBeenCalled();
  });

  it("rejects when nodeId is not a string", async () => {
    await expect(callToolWithValidation({ nodeId: 42 })).rejects.toThrow();
    expect(mockSendCommand).not.toHaveBeenCalled();
  });
});
