/**
 * Expired sign-ins. The site treats a stored token as "signed in", so an access token
 * that expired overnight kept showing the profile menu on the next visit while every request failed.
 * Only tokens whose JWT exp can be read and has passed are dropped; anything else (mock tokens,
 * tokens without exp) is left for the server to judge.
 */
const SKEW_MS = 30_000;

/** Expiry of a JWT in ms since epoch, or null when the token has no readable exp. */
export function tokenExpiresAt(token: string | null | undefined): number | null {
  if (!token) return null;
  try {
    let part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    while (part.length % 4) part += '=';
    const exp = JSON.parse(atob(part)).exp;
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function tokenExpired(token: string | null | undefined, now = Date.now()): boolean {
  const expiresAt = tokenExpiresAt(token);
  return expiresAt !== null && expiresAt <= now + SKEW_MS;
}

/**
 * Runs in <head> before any page script, so the first paint already shows 로그인/회원가입.
 * Same rule as tokenExpired and the same keys as clearAuthentication (lib/authSession.ts).
 */
export const authBootScript = `(function(){try{var t=localStorage.getItem('token');if(!t)return;var exp=null;try{var p=t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');while(p.length%4)p+='=';var e=JSON.parse(atob(p)).exp;if(typeof e==='number'&&isFinite(e))exp=e*1000;}catch(x){}if(exp===null||exp>Date.now()+${SKEW_MS})return;['token','nickname','userImgUrl'].forEach(function(k){localStorage.removeItem(k);});try{sessionStorage.removeItem('obo:preview:token');for(var i=sessionStorage.length-1;i>=0;i--){var k=sessionStorage.key(i);if(k&&k.indexOf('pending_sub_')===0)sessionStorage.removeItem(k);}}catch(x){}}catch(x){}})();`;
