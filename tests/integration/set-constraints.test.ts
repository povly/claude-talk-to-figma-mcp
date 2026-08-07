import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerModificationTools } from '../../src/talk_to_figma_mcp/tools/modification-tools';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket', () => ({
  sendCommandToFigma: jest.fn().mockResolvedValue({
    nodeId: "1:5",
    constraints: { horizontal: "CENTER", vertical: "MAX" },
  }),
}));

describe("set_constraints tool integration", () => {
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
        if (name === 'set_constraints') {
          toolHandler = handler;
          toolSchema = z.object(schema);
        }
      }
      return (originalTool as any)(...args);
    });

    registerModificationTools(server);
  });

  async function callToolWithValidation(args: any) {
    const validatedArgs = toolSchema.parse(args);
    const result = await toolHandler(validatedArgs, { meta: {} });
    return result;
  }

  it("calls sendCommandToFigma with set_constraints and both constraints", async () => {
    await callToolWithValidation({ nodeId: "1:5", horizontal: "CENTER", vertical: "MAX" });

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    const [command, payload] = mockSendCommand.mock.calls[0];
    expect(command).toBe("set_constraints");
    expect(payload).toEqual({ nodeId: "1:5", horizontal: "CENTER", vertical: "MAX" });
  });

  it("calls sendCommandToFigma with only horizontal (vertical undefined)", async () => {
    await callToolWithValidation({ nodeId: "1:5", horizontal: "STRETCH" });

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    const [, payload] = mockSendCommand.mock.calls[0];
    expect(payload.nodeId).toBe("1:5");
    expect(payload.horizontal).toBe("STRETCH");
    expect(payload.vertical).toBeUndefined();
  });

  it("returns text content summarizing applied constraints", async () => {
    const result = await callToolWithValidation({ nodeId: "1:5", horizontal: "CENTER", vertical: "MAX" });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Set constraints on node 1:5");
    expect(result.content[0].text).toContain("horizontal=CENTER");
    expect(result.content[0].text).toContain("vertical=MAX");
  });

  it("returns text error content when sendCommandToFigma throws", async () => {
    mockSendCommand.mockRejectedValueOnce(new Error("node not found"));

    const result = await callToolWithValidation({ nodeId: "9:9", horizontal: "MIN" });

    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Error setting constraints");
    expect(result.content[0].text).toContain("node not found");
  });

  it("accepts both constraints as optional (only nodeId required)", async () => {
    await callToolWithValidation({ nodeId: "1:5" });

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    const [, payload] = mockSendCommand.mock.calls[0];
    expect(payload.nodeId).toBe("1:5");
    expect(payload.horizontal).toBeUndefined();
    expect(payload.vertical).toBeUndefined();
  });
});
