import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applicationHote, deLApplication } from './navigateurIntegre.ts';

describe('le navigateur d’une application', () => {
  it('reconnaît les applications qui ouvrent les liens chez elles, et pas les navigateurs', () => {
    const agents: [string, string | null][] = [
      ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 339.0.0.12.100 (iPhone14,5; iOS 17_5; fr_FR)', 'Instagram'],
      ['Mozilla/5.0 (Linux; Android 14; SM-S911B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/466.0.0.52.107;]', 'Facebook'],
      ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/466.0.0.39.106;FBBV/1;FBDV/iPhone14,5]', 'Facebook'],
      ['Mozilla/5.0 (Linux; Android 14; Pixel 8 wv) AppleWebKit/537.36 Chrome/125.0 Mobile Safari/537.36 [FB_IAB/Orca-Android;FBAV/455.0.0.36.106;]', 'Messenger'],
      ['Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36 musical_ly_2023405030 BytedanceWebview/d8a21c6', 'TikTok'],
      ['Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36', null],
      ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', null],
      ['Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36', null],
    ];
    for (const [agent, attendu] of agents) assert.equal(applicationHote(agent), attendu, agent.slice(-60));
  });
  it('dit « d’Instagram » et « de Facebook »', () => {
    assert.equal(deLApplication('Instagram'), 'd’Instagram');
    assert.equal(deLApplication('Facebook'), 'de Facebook');
  });
});
