// Le bouton « Installer Philamots » : ce qu'il fait selon le navigateur, et ce que dit sa fenêtre selon la protection
// de la collection.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { adresseDansChrome, conseilDInstallation, estSamsungInternet, modeDInstallation } from './installation.ts';

const SAMSUNG = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36';
const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const IPAD_EN_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15';
const FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0';

describe('le bouton « Installer Philamots »', () => {
  it('reconnaît Samsung Internet, par son agent ou par ses marques', () => {
    assert.equal(estSamsungInternet(SAMSUNG), true);
    assert.equal(estSamsungInternet(CHROME_ANDROID), false);
    assert.equal(estSamsungInternet(CHROME_ANDROID, ['Chromium', 'Samsung Internet', 'Not;A=Brand']), true);
  });

  it('ouvre Chrome depuis Samsung Internet, explique le geste sur iPhone et iPad, ouvre la fenêtre du navigateur ailleurs', () => {
    const base = { installe: false, fenetreProposee: false };
    assert.equal(modeDInstallation({ ...base, agent: SAMSUNG }), 'chrome');
    assert.equal(modeDInstallation({ ...base, agent: IPHONE }), 'iphone');
    assert.equal(modeDInstallation({ ...base, agent: IPAD_EN_MAC, tactileMac: true }), 'iphone');
    assert.equal(modeDInstallation({ ...base, agent: IPAD_EN_MAC }), 'aucun', 'un vrai Mac : rien à proposer');
    assert.equal(modeDInstallation({ ...base, agent: CHROME_ANDROID, fenetreProposee: true }), 'fenetre');
    assert.equal(modeDInstallation({ ...base, agent: CHROME_ANDROID }), 'aucun', 'Chrome n’a rien proposé (déjà installé, ou pas encore)');
    assert.equal(modeDInstallation({ ...base, agent: FIREFOX }), 'aucun');
  });

  it('ne propose rien quand le jeu tourne déjà dans sa propre fenêtre', () => {
    for (const agent of [SAMSUNG, IPHONE, CHROME_ANDROID]) assert.equal(modeDInstallation({ agent, installe: true, fenetreProposee: true }), 'aucun');
  });

  it('ouvre le jeu dans Chrome, ou sa page du Play Store si Chrome manque', () => {
    assert.equal(adresseDansChrome('philamots.fr', '/'),
      'intent://philamots.fr/#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.android.chrome;end');
  });

  it('envoie d’abord l’invité sans code créer le sien : sa collection ne suivrait pas', () => {
    for (const mode of ['chrome', 'iphone'] as const) {
      const conseil = conseilDInstallation(mode, 'aucune');
      assert.equal(conseil.suite, 'compte');
      assert.equal(conseil.confirmer, 'Créer mon code');
      assert.match(conseil.message, /code de secours/);
    }
  });

  it('dit comment retrouver la collection : se reconnecter, ou entrer son code', () => {
    const connecte = conseilDInstallation('chrome', 'compte');
    assert.equal(connecte.suite, 'chrome');
    assert.equal(connecte.confirmer, 'Ouvrir dans Chrome');
    assert.match(connecte.message, /reconnecte-toi depuis Mon compte/);
    assert.match(conseilDInstallation('chrome', 'code').message, /entre ton code de secours/);
    const iphone = conseilDInstallation('iphone', 'code');
    assert.equal(iphone.suite, null);
    assert.equal(iphone.seul, true);
    assert.match(iphone.message, /Sur l’écran d’accueil/);
  });
});
