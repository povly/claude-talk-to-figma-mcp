import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerStyleTools } from '../../src/talk_to_figma_mcp/tools/style-tools';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket', () => ({
  sendCommandToFigma: jest.fn().mockResolvedValue({
    id: 'grid-style-123',
    name: 'Layout/12-col',
    key: 'abc123def456',
  }),
}));

describe("create_grid_style tool integration", () => {
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
    mockSendCommand.mockResolvedValue({
      id: 'grid-style-123',
      name: 'Layout/12-col',
      key: 'abc123def456',
    });

    const originalTool = server.tool.bind(server);
    jest.spyOn(server, 'tool').mockImplementation((...args: any[]) => {
      if (args.length === 4) {
        const [name, description, schema, handler] = args;
        if (name === 'create_grid_style') {
          toolHandler = handler;
          toolSchema = z.object(schema);
        }
      }
      return (originalTool as any)(...args);
    });

    registerStyleTools(server);
  });

  async function callToolWithValidation(args: any) {
    const validatedArgs = toolSchema.parse(args);
    const result = await toolHandler(validatedArgs, { meta: {} });
    return result;
  }

  it("calls sendCommandToFigma with the create_grid_style command", async () => {
    await callToolWithValidation({
      name: 'Layout/12-col',
      grids: [{ pattern: 'COLUMNS', count: 12, sectionSize: 80, gutter: 16 }],
    });

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    const [command] = mockSendCommand.mock.calls[0];
    expect(command).toBe("create_grid_style");
  });

  it("sends the provided name and grids in the payload", async () => {
    const grids = [
      { pattern: 'COLUMNS', count: 12, sectionSize: 80, gutter: 16, alignment: 'STRETCH' },
    ];
    await callToolWithValidation({ name: 'Layout/12-col', grids });

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    const [, payload] = mockSendCommand.mock.calls[0];
    expect(payload.name).toBe('Layout/12-col');
    expect(payload.grids).toHaveLength(1);
    expect(payload.grids[0]).toMatchObject(grids[0]);
    expect(payload.grids[0].visible).toBe(true);
  });

  it("returns text content with style name and ID on success", async () => {
    const result = await callToolWithValidation({
      name: 'Layout/12-col',
      grids: [{ pattern: 'GRID', sectionSize: 8 }],
    });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain('Layout/12-col');
    expect(result.content[0].text).toContain('grid-style-123');
    expect(result.content[0].text).toContain('abc123def456');
    expect(result.isError).toBeUndefined();
  });

  it("returns text error with isError: true when sendCommandToFigma throws", async () => {
    mockSendCommand.mockRejectedValueOnce(new Error("websocket disconnected"));

    const result = await callToolWithValidation({
      name: 'Broken',
      grids: [{ pattern: 'GRID', sectionSize: 8 }],
    });

    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Error creating grid style");
    expect(result.content[0].text).toContain("websocket disconnected");
    expect(result.isError).toBe(true);
  });

  it("handles non-Error rejection values", async () => {
    mockSendCommand.mockRejectedValueOnce("string error");

    const result = await callToolWithValidation({
      name: 'Broken',
      grids: [{ pattern: 'GRID', sectionSize: 8 }],
    });

    expect(result.content[0].text).toContain("Error creating grid style");
    expect(result.content[0].text).toContain("string error");
    expect(result.isError).toBe(true);
  });

  it("accepts COLUMNS pattern with full configuration", async () => {
    const grids = [{
      pattern: 'COLUMNS',
      count: 12,
      sectionSize: 80,
      gutter: 16,
      offset: 0,
      alignment: 'CENTER',
      visible: true,
      color: { r: 0.5, g: 0.5, b: 0.5, a: 0.2 },
    }];
    await callToolWithValidation({ name: 'Cols', grids });

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    const [, payload] = mockSendCommand.mock.calls[0];
    expect(payload.grids[0].pattern).toBe('COLUMNS');
    expect(payload.grids[0].count).toBe(12);
    expect(payload.grids[0].alignment).toBe('CENTER');
  });

  it("accepts ROWS pattern", async () => {
    await callToolWithValidation({
      name: 'Rows',
      grids: [{ pattern: 'ROWS', count: 6, sectionSize: 64 }],
    });

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    const [, payload] = mockSendCommand.mock.calls[0];
    expect(payload.grids[0].pattern).toBe('ROWS');
  });

  it("accepts GRID pattern", async () => {
    await callToolWithValidation({
      name: 'Grid',
      grids: [{ pattern: 'GRID', sectionSize: 8 }],
    });

    expect(mockSendCommand).toHaveBeenCalledTimes(1);
    const [, payload] = mockSendCommand.mock.calls[0];
    expect(payload.grids[0].pattern).toBe('GRID');
  });

  it("rejects invalid pattern values", async () => {
    await expect(callToolWithValidation({
      name: 'Bad',
      grids: [{ pattern: 'DIAGONAL', sectionSize: 8 }],
    })).rejects.toThrow();
  });

  it("defaults visible to true when omitted", async () => {
    await callToolWithValidation({
      name: 'Grid',
      grids: [{ pattern: 'GRID', sectionSize: 8 }],
    });

    const [, payload] = mockSendCommand.mock.calls[0];
    expect(payload.grids[0].visible).toBe(true);
  });

  it("requires name field", async () => {
    await expect(callToolWithValidation({
      grids: [{ pattern: 'GRID', sectionSize: 8 }],
    })).rejects.toThrow();
  });

  it("requires grids array", async () => {
    await expect(callToolWithValidation({
      name: 'NoGrids',
    })).rejects.toThrow();
  });
});
