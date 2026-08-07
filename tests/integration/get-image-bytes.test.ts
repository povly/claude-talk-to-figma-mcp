import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerImageTools } from '../../src/talk_to_figma_mcp/tools/image-tools';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket', () => ({
  sendCommandToFigma: jest.fn().mockResolvedValue({
    nodeId: "1:2",
    format: "PNG",
    base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
    mimeType: "image/png",
  }),
}));

describe("get_image_bytes tool integration", () => {
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
        if (name === 'get_image_bytes') {
          toolHandler = handler;
          toolSchema = z.object(schema);
        }
      }
      return (originalTool as any)(...args);
    });

    registerImageTools(server);
  });

  async function callToolWithValidation(args: any) {
    const validatedArgs = toolSchema.parse(args);
    const result = await toolHandler(validatedArgs, { meta: {} });
    return result;
  }

  it("calls sendCommandToFigma with default format=PNG and scale=1", async () => {
    await callToolWithValidation({ nodeId: "1:2" });

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    const [command, payload] = mockSendCommand.mock.calls[0];
    expect(command).toBe("get_image_bytes");
    expect(payload.nodeId).toBe("1:2");
    expect(payload.format).toBe("PNG");
    expect(payload.scale).toBe(1);
  });

  it("calls sendCommandToFigma with provided format and scale", async () => {
    await callToolWithValidation({ nodeId: "1:2", format: "JPG", scale: 2 });

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    const [, payload] = mockSendCommand.mock.calls[0];
    expect(payload.nodeId).toBe("1:2");
    expect(payload.format).toBe("JPG");
    expect(payload.scale).toBe(2);
  });

  it("returns image content with base64 data and mimeType", async () => {
    const result = await callToolWithValidation({ nodeId: "1:2" });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("image");
    expect(result.content[0].data).toBe("iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB");
    expect(result.content[0].mimeType).toBe("image/png");
  });

  it("returns text error content when sendCommandToFigma throws", async () => {
    mockSendCommand.mockRejectedValueOnce(new Error("node not found"));

    const result = await callToolWithValidation({ nodeId: "9:9" });

    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Error getting image bytes");
    expect(result.content[0].text).toContain("node not found");
  });

  it("requires nodeId (zod validation rejects missing nodeId)", async () => {
    await expect(callToolWithValidation({})).rejects.toThrow();
    expect(mockSendCommand).not.toHaveBeenCalled();
  });
});
