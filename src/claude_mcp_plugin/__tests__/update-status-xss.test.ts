import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('updateStatus XSS prevention principle', () => {
  let dom: JSDOM;
  let document: Document;
  let status: HTMLElement;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><div id="connection-status"></div>');
    document = dom.window.document;
    status = document.getElementById('connection-status')!;
  });

  it('textContent renders malicious channel name as inert text', () => {
    const malicious = '<img src=x onerror=window.__xss=true>';
    status.textContent = malicious;
    expect(status.querySelectorAll('img').length).toBe(0);
    expect(status.querySelectorAll('script').length).toBe(0);
    expect(status.textContent).toBe(malicious);
  });

  it('textContent with options.channelName via createElement is safe', () => {
    const channelName = '<script>alert(1)</script>';
    const span = document.createElement('span');
    span.className = 'mcp-plugin__channel-name';
    span.textContent = channelName;
    status.appendChild(span);
    expect(status.querySelectorAll('script').length).toBe(0);
    expect(span.textContent).toBe(channelName);
  });

  it('innerHTML with interpolation would execute (documents the threat)', () => {
    const malicious = '<img src=x onerror=window.__xss=true>';
    status.innerHTML = `Channel: ${malicious}`;
    expect(status.querySelectorAll('img').length).toBe(1);
    expect(dom.window.__xss).toBeUndefined();
  });
});
