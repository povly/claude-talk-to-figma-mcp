import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCreationTools } from '../../src/talk_to_figma_mcp/tools/creation-tools';
import { registerDocumentTools } from '../../src/talk_to_figma_mcp/tools/document-tools';
import { registerTextTools } from '../../src/talk_to_figma_mcp/tools/text-tools';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket', () => ({
  sendCommandToFigma: jest.fn(),
}));

describe('isError: true standardization across tool handlers', () => {
  let mockSendCommand: jest.Mock;

  beforeEach(() => {
    mockSendCommand = require('../../src/talk_to_figma_mcp/utils/websocket').sendCommandToFigma;
    mockSendCommand.mockReset();
  });

  async function captureToolHandler(
    register: (server: McpServer) => void,
    toolName: string
  ): Promise<{ handler: Function; schema: z.ZodObject<any> }> {
    const server = new McpServer(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    let handler: Function | undefined;
    let schema: z.ZodObject<any> | undefined;

    const originalTool = server.tool.bind(server);
    jest.spyOn(server, 'tool').mockImplementation((...args: any[]) => {
      if (args.length === 4) {
        const [name, , toolSchema, h] = args;
        if (name === toolName) {
          handler = h;
          schema = z.object(toolSchema);
        }
      }
      return (originalTool as any)(...args);
    });

    register(server);

    if (!handler || !schema) {
      throw new Error(`Tool ${toolName} was not registered`);
    }
    return { handler, schema };
  }

  it('document-tools handler returns isError: true on sendCommand rejection', async () => {
    mockSendCommand.mockRejectedValueOnce(new Error('WS connection closed'));
    const { handler, schema } = await captureToolHandler(registerDocumentTools, 'get_selection');

    const validatedArgs = schema.parse({});
    const result = await handler(validatedArgs, { meta: {} });

    expect(result.isError).toBe(true);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toMatch(/^Error .*WS connection closed$/);
  });

  it('creation-tools handler returns isError: true on sendCommand rejection', async () => {
    mockSendCommand.mockRejectedValueOnce(new Error('parentId missing'));
    const { handler, schema } = await captureToolHandler(
      registerCreationTools,
      'create_rectangle'
    );

    const validatedArgs = schema.parse({
      parentId: '0:1',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
    const result = await handler(validatedArgs, { meta: {} });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('parentId missing');
  });

  it('text-tools handler returns isError: true on sendCommand rejection', async () => {
    mockSendCommand.mockRejectedValueOnce(new Error('Font load timeout'));
    const { handler, schema } = await captureToolHandler(registerTextTools, 'set_text_content');

    const validatedArgs = schema.parse({
      nodeId: '1:2',
      text: 'hello',
    });
    const result = await handler(validatedArgs, { meta: {} });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Font load timeout');
  });

  it('isError is absent on success path (success is not flagged as error)', async () => {
    mockSendCommand.mockResolvedValueOnce({ name: 'MockNode' });
    const { handler, schema } = await captureToolHandler(registerDocumentTools, 'get_selection');

    const validatedArgs = schema.parse({});
    const result = await handler(validatedArgs, { meta: {} });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].type).toBe('text');
  });
});
