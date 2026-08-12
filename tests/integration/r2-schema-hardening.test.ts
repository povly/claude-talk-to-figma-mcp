import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerVariableTools } from '../../src/talk_to_figma_mcp/tools/variable-tools';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket', () => ({
  sendCommandToFigma: jest.fn(),
}));

describe('R2 schema hardening — integration', () => {
  let mockSendCommand: jest.Mock;

  beforeEach(() => {
    mockSendCommand = require('../../src/talk_to_figma_mcp/utils/websocket').sendCommandToFigma;
    mockSendCommand.mockReset();
  });

  async function captureToolHandler(
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

    registerVariableTools(server);

    if (!handler || !schema) {
      throw new Error(`Tool ${toolName} was not registered`);
    }
    return { handler, schema };
  }

  describe('set_variable value/resolvedType cross-field validation', () => {
    it('accepts value:string + resolvedType:STRING', async () => {
      mockSendCommand.mockResolvedValueOnce({
        variableId: '1',
        variableName: 'spacing',
        collectionName: 'tokens',
      });
      const { handler, schema } = await captureToolHandler('set_variable');

      const validated = schema.parse({
        name: 'spacing',
        resolvedType: 'STRING',
        value: '8px',
      });
      const result = await handler(validated, { meta: {} });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      expect(result.isError).toBeFalsy();
    });

    it('accepts value:number + resolvedType:FLOAT', async () => {
      mockSendCommand.mockResolvedValueOnce({
        variableId: '2',
        variableName: 'opacity',
        collectionName: 'tokens',
      });
      const { handler, schema } = await captureToolHandler('set_variable');

      const validated = schema.parse({
        name: 'opacity',
        resolvedType: 'FLOAT',
        value: 0.5,
      });
      const result = await handler(validated, { meta: {} });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      expect(result.isError).toBeFalsy();
    });

    it('accepts value:boolean + resolvedType:BOOLEAN', async () => {
      mockSendCommand.mockResolvedValueOnce({
        variableId: '3',
        variableName: 'isVisible',
        collectionName: 'tokens',
      });
      const { handler, schema } = await captureToolHandler('set_variable');

      const validated = schema.parse({
        name: 'isVisible',
        resolvedType: 'BOOLEAN',
        value: true,
      });
      const result = await handler(validated, { meta: {} });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      expect(result.isError).toBeFalsy();
    });

    it('accepts value:{r,g,b,a} + resolvedType:COLOR', async () => {
      mockSendCommand.mockResolvedValueOnce({
        variableId: '4',
        variableName: 'accent',
        collectionName: 'tokens',
      });
      const { handler, schema } = await captureToolHandler('set_variable');

      const validated = schema.parse({
        name: 'accent',
        resolvedType: 'COLOR',
        value: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
      });
      const result = await handler(validated, { meta: {} });

      expect(mockSendCommand).toHaveBeenCalledTimes(1);
      expect(result.isError).toBeFalsy();
    });

    it('rejects value:string + resolvedType:COLOR via handler typeCheck', async () => {
      const { handler, schema } = await captureToolHandler('set_variable');

      const validated = schema.parse({
        name: 'accent',
        resolvedType: 'COLOR',
        value: 'red',
      });
      const result = await handler(validated, { meta: {} });

      expect(mockSendCommand).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/does not match resolvedType/);
    });

    it('rejects value:number + resolvedType:STRING via handler typeCheck', async () => {
      const { handler, schema } = await captureToolHandler('set_variable');

      const validated = schema.parse({
        name: 'spacing',
        resolvedType: 'STRING',
        value: 8,
      });
      const result = await handler(validated, { meta: {} });

      expect(mockSendCommand).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/does not match resolvedType/);
    });
  });
});
